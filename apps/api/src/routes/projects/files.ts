import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
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

// GET /
const listRoute = createRoute({
  method: 'get', path: '/', tags: ['Project Files'], summary: 'List project files',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid(), projectId: z.string().uuid() }),
    query: z.object({ cursor: z.string().optional(), limit: z.coerce.number().int().min(1).max(100).default(50) }),
  },
  responses: { 200: { description: 'List', content: { 'application/json': { schema: z.object({ data: z.array(z.any()), next_cursor: z.string().nullable() }) } } }, 401: { description: 'Unauthorized' }, 403: { description: 'Forbidden' }, 404: { description: 'Not found' } },
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

  let query = supabase.from('project_files').select('*').eq('project_id', projectId).order('created_at', { ascending: false }).limit(limit + 1);
  if (cursor) query = query.lt('created_at', cursor);

  const { data: files, error } = await query;
  if (error) return internalError(c, error.message);
  const items = files ?? [];
  let next_cursor: string | null = null;
  if (items.length > limit) { const last = items.pop(); next_cursor = last?.created_at ?? null; }
  return c.json({ data: items, next_cursor });
});

// POST / — Create file record (after uploading to Supabase Storage)
const createRouteSpec = createRoute({
  method: 'post', path: '/', tags: ['Project Files'], summary: 'Register a project file',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid(), projectId: z.string().uuid() }),
    body: { content: { 'application/json': { schema: z.object({
      name: z.string().min(1).max(255),
      url: z.string().url(),
      type: z.string().max(100).default('application/octet-stream'),
      size: z.number().int().min(0),
    }) } }, required: true },
  },
  responses: { 201: { description: 'Created', content: { 'application/json': { schema: z.object({ data: z.any() }) } } }, 400: { description: 'Bad request' }, 401: { description: 'Unauthorized' }, 403: { description: 'Forbidden' }, 404: { description: 'Not found' } },
});

app.openapi(createRouteSpec, async (c) => {
  const user = c.get('user');
  const { orgId, projectId } = c.req.valid('param');
  const body = c.req.valid('json');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'Not a member');
  const project = await verifyProjectBelongsToOrg(projectId, orgId);
  if (!project) return notFound(c, 'Project not found');

  const { data: file, error } = await supabase.from('project_files')
    .insert({ project_id: projectId, uploaded_by: user.id, name: body.name, url: body.url, type: body.type, size: body.size })
    .select().single();
  if (error) return badRequest(c, error.message);
  return c.json({ data: file }, 201);
});

// DELETE /:fileId
const deleteRouteSpec = createRoute({
  method: 'delete', path: '/:fileId', tags: ['Project Files'], summary: 'Delete a project file',
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ orgId: z.string().uuid(), projectId: z.string().uuid(), fileId: z.string().uuid() }) },
  responses: { 200: { description: 'Deleted' }, 404: { description: 'Not found' } },
});

app.openapi(deleteRouteSpec, async (c) => {
  const user = c.get('user');
  const { orgId, projectId, fileId } = c.req.valid('param');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'Not a member');

  const { data: existing } = await supabase.from('project_files').select('id').eq('id', fileId).eq('project_id', projectId).maybeSingle();
  if (!existing) return notFound(c, 'File not found');

  const { error } = await supabase.from('project_files').delete().eq('id', fileId);
  if (error) return internalError(c, error.message);
  return c.json({ success: true });
});

export default app;
