import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { createTaskSchema, updateTaskSchema } from '@ollo-dev/shared/validators';
import { createServiceClient } from '../../lib/supabase.js';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import { badRequest, forbidden, notFound, internalError } from '../../lib/errors.js';

const app = new OpenAPIHono<{ Variables: AuthVariables }>();
app.use('/*', authMiddleware);

async function verifyOrgMembership(orgId: string, userId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('org_members').select('*').eq('org_id', orgId).eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

async function verifyProjectBelongsToOrg(projectId: string, orgId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('projects').select('id').eq('id', projectId).eq('org_id', orgId).maybeSingle();
  if (error) throw error;
  return data;
}

// GET /
const listRoute = createRoute({
  method: 'get', path: '/', tags: ['Project Tasks'],
  summary: 'List tasks for a project',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid(), projectId: z.string().uuid() }),
    query: z.object({
      type: z.string().optional(),
      status: z.string().optional(),
      cursor: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(100).default(50),
    }),
  },
  responses: {
    200: { description: 'List of tasks', content: { 'application/json': { schema: z.object({ data: z.array(z.any()), next_cursor: z.string().nullable() }) } } },
    401: { description: 'Unauthorized' }, 403: { description: 'Forbidden' }, 404: { description: 'Not found' },
  },
});

app.openapi(listRoute, async (c) => {
  const user = c.get('user');
  const { orgId, projectId } = c.req.valid('param');
  const { type, status, cursor, limit } = c.req.valid('query');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');
  const project = await verifyProjectBelongsToOrg(projectId, orgId);
  if (!project) return notFound(c, 'Project not found');

  let query = supabase.from('project_tasks').select('*').eq('project_id', projectId)
    .order('sort_order', { ascending: true }).order('created_at', { ascending: false }).limit(limit + 1);

  if (type) query = query.eq('type', type);
  if (status) query = query.eq('status', status);
  if (cursor) query = query.lt('created_at', cursor);

  const { data: tasks, error } = await query;
  if (error) return internalError(c, error.message);

  const items = tasks ?? [];
  let next_cursor: string | null = null;
  if (items.length > limit) { const last = items.pop(); next_cursor = last?.created_at ?? null; }

  return c.json({ data: items, next_cursor });
});

// POST /
const createRouteSpec = createRoute({
  method: 'post', path: '/', tags: ['Project Tasks'],
  summary: 'Create a new task',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid(), projectId: z.string().uuid() }),
    body: { content: { 'application/json': { schema: createTaskSchema } }, required: true },
  },
  responses: {
    201: { description: 'Task created', content: { 'application/json': { schema: z.object({ data: z.any() }) } } },
    400: { description: 'Bad request' }, 401: { description: 'Unauthorized' }, 403: { description: 'Forbidden' },
  },
});

app.openapi(createRouteSpec, async (c) => {
  const user = c.get('user');
  const { orgId, projectId } = c.req.valid('param');
  const body = c.req.valid('json');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');
  const project = await verifyProjectBelongsToOrg(projectId, orgId);
  if (!project) return notFound(c, 'Project not found');

  const { data: task, error } = await supabase.from('project_tasks')
    .insert({ project_id: projectId, title: body.title, description: body.description ?? null, type: body.type, status: body.status, priority: body.priority, assignee_id: body.assignee_id ?? null, due_at: body.due_at ?? null, tags: body.tags })
    .select().single();

  if (error) return badRequest(c, error.message);
  return c.json({ data: task }, 201);
});

// PATCH /:taskId
const updateRouteSpec = createRoute({
  method: 'patch', path: '/:taskId', tags: ['Project Tasks'],
  summary: 'Update a task',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid(), projectId: z.string().uuid(), taskId: z.string().uuid() }),
    body: { content: { 'application/json': { schema: updateTaskSchema } }, required: true },
  },
  responses: {
    200: { description: 'Task updated', content: { 'application/json': { schema: z.object({ data: z.any() }) } } },
    400: { description: 'Bad request' }, 401: { description: 'Unauthorized' }, 403: { description: 'Forbidden' }, 404: { description: 'Not found' },
  },
});

app.openapi(updateRouteSpec, async (c) => {
  const user = c.get('user');
  const { orgId, projectId, taskId } = c.req.valid('param');
  const body = c.req.valid('json');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  const { data: existing, error: fetchErr } = await supabase.from('project_tasks')
    .select('*').eq('id', taskId).eq('project_id', projectId).maybeSingle();
  if (fetchErr) return internalError(c, fetchErr.message);
  if (!existing) return notFound(c, 'Task not found');

  const { data: task, error } = await supabase.from('project_tasks').update(body).eq('id', taskId).select().single();
  if (error) return badRequest(c, error.message);

  return c.json({ data: task });
});

// DELETE /:taskId
const deleteRouteSpec = createRoute({
  method: 'delete', path: '/:taskId', tags: ['Project Tasks'],
  summary: 'Delete a task',
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ orgId: z.string().uuid(), projectId: z.string().uuid(), taskId: z.string().uuid() }) },
  responses: { 200: { description: 'Task deleted' }, 401: { description: 'Unauthorized' }, 403: { description: 'Forbidden' }, 404: { description: 'Not found' } },
});

app.openapi(deleteRouteSpec, async (c) => {
  const user = c.get('user');
  const { orgId, projectId, taskId } = c.req.valid('param');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  const { data: existing, error: fetchErr } = await supabase.from('project_tasks')
    .select('id').eq('id', taskId).eq('project_id', projectId).maybeSingle();
  if (fetchErr) return internalError(c, fetchErr.message);
  if (!existing) return notFound(c, 'Task not found');

  const { error } = await supabase.from('project_tasks').delete().eq('id', taskId);
  if (error) return internalError(c, error.message);
  return c.json({ success: true });
});

export default app;
