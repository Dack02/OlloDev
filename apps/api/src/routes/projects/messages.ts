import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { createProjectMessageSchema } from '@ollo-dev/shared/validators';
import { createServiceClient } from '../../lib/supabase.js';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import { badRequest, forbidden, notFound, internalError } from '../../lib/errors.js';

const app = new OpenAPIHono<{ Variables: AuthVariables }>();
app.use('/*', authMiddleware);

async function verifyOrgMembership(orgId: string, userId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase.from('org_members').select('*').eq('org_id', orgId).eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

async function verifyProjectBelongsToOrg(projectId: string, orgId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase.from('projects').select('id').eq('id', projectId).eq('org_id', orgId).maybeSingle();
  if (error) throw error;
  return data;
}

// GET / — List messages (with cursor pagination, newest first)
const listRoute = createRoute({
  method: 'get', path: '/', tags: ['Project Messages'], summary: 'List project messages',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid(), projectId: z.string().uuid() }),
    query: z.object({ cursor: z.string().optional(), limit: z.coerce.number().int().min(1).max(100).default(50) }),
  },
  responses: { 200: { description: 'Messages', content: { 'application/json': { schema: z.object({ data: z.array(z.any()), next_cursor: z.string().nullable() }) } } }, 401: { description: 'Unauthorized' }, 403: { description: 'Forbidden' }, 404: { description: 'Not found' } },
});

app.openapi(listRoute, async (c) => {
  const user = c.get('user');
  const { orgId, projectId } = c.req.valid('param');
  const { cursor, limit } = c.req.valid('query');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'Not a member');
  const project = await verifyProjectBelongsToOrg(projectId, orgId);
  if (!project) return notFound(c, 'Project not found');

  // Fetch messages joined with profiles for author display name
  let query = supabase
    .from('project_messages')
    .select('*, profiles:author_id(display_name)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (cursor) query = query.lt('created_at', cursor);

  const { data: messages, error } = await query;
  if (error) return internalError(c, error.message);

  const items = (messages ?? []).map((m: any) => ({
    id: m.id,
    project_id: m.project_id,
    author_id: m.author_id,
    author_name: m.profiles?.display_name ?? 'Unknown',
    body: m.body,
    created_at: m.created_at,
  }));

  let next_cursor: string | null = null;
  if (items.length > limit) { items.pop(); next_cursor = items[items.length - 1]?.created_at ?? null; }

  return c.json({ data: items, next_cursor });
});

// POST / — Send message
const createRouteSpec = createRoute({
  method: 'post', path: '/', tags: ['Project Messages'], summary: 'Send a project message',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid(), projectId: z.string().uuid() }),
    body: { content: { 'application/json': { schema: createProjectMessageSchema } }, required: true },
  },
  responses: { 201: { description: 'Sent', content: { 'application/json': { schema: z.object({ data: z.any() }) } } }, 400: { description: 'Bad request' }, 401: { description: 'Unauthorized' }, 403: { description: 'Forbidden' }, 404: { description: 'Not found' } },
});

app.openapi(createRouteSpec, async (c) => {
  const user = c.get('user');
  const { orgId, projectId } = c.req.valid('param');
  const { body: messageBody } = c.req.valid('json');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'Not a member');
  const project = await verifyProjectBelongsToOrg(projectId, orgId);
  if (!project) return notFound(c, 'Project not found');

  const { data: message, error } = await supabase.from('project_messages')
    .insert({ project_id: projectId, author_id: user.id, body: messageBody })
    .select().single();
  if (error) return badRequest(c, error.message);

  // Fetch display name for the response
  const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', user.id).maybeSingle();

  return c.json({
    data: {
      ...message,
      author_name: profile?.display_name ?? 'Unknown',
    },
  }, 201);
});

export default app;
