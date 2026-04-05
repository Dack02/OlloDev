import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { createServiceClient } from '../../lib/supabase.js';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import { forbidden, badRequest, internalError } from '../../lib/errors.js';

const app = new OpenAPIHono<{ Variables: AuthVariables }>();

app.use('/*', authMiddleware);

// ============================================================
// Helpers
// ============================================================

async function verifyOrgMembership(orgId: string, userId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('org_members')
    .select('*')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

const VALID_SCOPES = ['messages', 'tickets', 'wiki', 'discussions'] as const;
type SearchScope = typeof VALID_SCOPES[number];

const searchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  scope: z.string().optional(), // comma-separated: messages,tickets,wiki,discussions
});

// ============================================================
// GET / — Unified search
// ============================================================
const searchRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Search'],
  summary: 'Unified full-text search across org content',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid() }),
    query: searchQuerySchema,
  },
  responses: {
    200: {
      description: 'Search results grouped by type',
      content: {
        'application/json': {
          schema: z.object({
            data: z.object({
              messages: z.array(z.any()).optional(),
              tickets: z.array(z.any()).optional(),
              wiki: z.array(z.any()).optional(),
              discussions: z.array(z.any()).optional(),
            }),
            query: z.string(),
            scopes: z.array(z.string()),
          }),
        },
      },
    },
    400: { description: 'Bad request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
  },
});

app.openapi(searchRoute, async (c) => {
  const user = c.get('user');
  const { orgId } = c.req.valid('param');
  const { q, scope } = c.req.valid('query');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  // Determine which scopes to search
  let scopes: SearchScope[];
  if (scope) {
    const requested = scope.split(',').map((s) => s.trim()) as SearchScope[];
    scopes = requested.filter((s) => VALID_SCOPES.includes(s));
    if (scopes.length === 0) {
      return badRequest(c, `Invalid scope. Valid values: ${VALID_SCOPES.join(', ')}`);
    }
  } else {
    scopes = [...VALID_SCOPES];
  }

  // Build a tsquery-safe search term (plain text matching)
  // We use plainto_tsquery for safety with arbitrary user input
  const results: Record<string, unknown[]> = {};

  const searchPromises = scopes.map(async (s) => {
    try {
      switch (s) {
        case 'messages': {
          // Get org channel IDs first
          const { data: channels } = await supabase
            .from('channels')
            .select('id')
            .eq('org_id', orgId)
            .eq('is_archived', false);

          const channelIds = (channels ?? []).map((ch) => ch.id);
          if (channelIds.length === 0) {
            results.messages = [];
            return;
          }

          const { data: messages } = await supabase
            .from('messages')
            .select('id, channel_id, author_id, content, created_at')
            .in('channel_id', channelIds)
            .eq('is_deleted', false)
            .textSearch('content', q, { type: 'plain', config: 'english' })
            .limit(10);

          results.messages = messages ?? [];
          break;
        }

        case 'tickets': {
          const { data: tickets } = await supabase
            .from('tickets')
            .select('id, subject, description, status, priority, requester_id, assignee_id, created_at')
            .eq('org_id', orgId)
            .or(
              `subject.ilike.%${q}%,description.ilike.%${q}%`
            )
            .limit(10);

          results.tickets = tickets ?? [];
          break;
        }

        case 'wiki': {
          // Get org space IDs first
          const { data: spaces } = await supabase
            .from('wiki_spaces')
            .select('id')
            .eq('org_id', orgId);

          const spaceIds = (spaces ?? []).map((sp) => sp.id);
          if (spaceIds.length === 0) {
            results.wiki = [];
            return;
          }

          const { data: pages } = await supabase
            .from('wiki_pages')
            .select('id, space_id, title, slug, author_id, is_published, created_at, updated_at')
            .in('space_id', spaceIds)
            .or(`title.ilike.%${q}%,content.ilike.%${q}%`)
            .limit(10);

          results.wiki = pages ?? [];
          break;
        }

        case 'discussions': {
          const { data: discussions } = await supabase
            .from('discussions')
            .select('id, title, body, category, tags, author_id, upvotes, reply_count, created_at')
            .eq('org_id', orgId)
            .or(`title.ilike.%${q}%,body.ilike.%${q}%`)
            .limit(10);

          results.discussions = discussions ?? [];
          break;
        }
      }
    } catch {
      results[s] = [];
    }
  });

  await Promise.all(searchPromises);

  return c.json({
    data: results,
    query: q,
    scopes,
  });
});

export default app;
