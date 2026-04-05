import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { createServiceClient } from '../../lib/supabase.js';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import { forbidden, internalError } from '../../lib/errors.js';

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

const app = new OpenAPIHono<{ Variables: AuthVariables }>();
app.use('/*', authMiddleware);

// ============================================================
// GET / — Git activity feed for a project
// ============================================================
const activityRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['GitHub'],
  summary: 'Git activity feed for a project',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      projectId: z.string().uuid(),
    }),
    query: z.object({
      limit: z.coerce.number().int().min(1).max(100).default(50),
      cursor: z.string().datetime().optional(),
    }),
  },
  responses: {
    200: { description: 'Activity events' },
  },
});

app.openapi(activityRoute, async (c) => {
  const user = c.get('user');
  const { orgId, projectId } = c.req.valid('param');
  const { limit, cursor } = c.req.valid('query');

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  const supabase = createServiceClient();

  // Get repo IDs for this project
  const { data: repos } = await supabase
    .from('github_repos')
    .select('id')
    .eq('project_id', projectId);

  if (!repos?.length) return c.json({ data: [], meta: { has_more: false } });

  const repoIds = repos.map((r) => r.id);

  let query = supabase
    .from('github_events')
    .select('*')
    .in('repo_id', repoIds)
    .order('created_at', { ascending: false })
    .limit(limit + 1); // fetch one extra to check has_more

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;

  if (error) return internalError(c, error.message);

  const events = data ?? [];
  const hasMore = events.length > limit;
  if (hasMore) events.pop();

  const nextCursor = events.length > 0 ? events[events.length - 1].created_at : null;

  return c.json({
    data: events,
    meta: { has_more: hasMore, cursor: nextCursor },
  });
});

export default app;
