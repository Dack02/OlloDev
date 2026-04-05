import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { createNoteSchema, updateNoteSchema } from '@ollo-dev/shared/validators';
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
  method: 'get', path: '/', tags: ['Project Notes'],
  summary: 'List notes for a project',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid(), projectId: z.string().uuid() }),
    query: z.object({
      cursor: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(100).default(50),
    }),
  },
  responses: {
    200: { description: 'List of notes', content: { 'application/json': { schema: z.object({ data: z.array(z.any()), next_cursor: z.string().nullable() }) } } },
    401: { description: 'Unauthorized' }, 403: { description: 'Forbidden' }, 404: { description: 'Not found' },
  },
});

app.openapi(listRoute, async (c) => {
  const user = c.get('user');
  const { orgId, projectId } = c.req.valid('param');
  const { cursor, limit } = c.req.valid('query');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');
  const project = await verifyProjectBelongsToOrg(projectId, orgId);
  if (!project) return notFound(c, 'Project not found');

  let query = supabase.from('project_notes').select('*').eq('project_id', projectId)
    .order('is_pinned', { ascending: false }).order('updated_at', { ascending: false }).limit(limit + 1);

  if (cursor) query = query.lt('updated_at', cursor);

  const { data: notes, error } = await query;
  if (error) return internalError(c, error.message);

  const items = notes ?? [];
  let next_cursor: string | null = null;
  if (items.length > limit) { const last = items.pop(); next_cursor = last?.updated_at ?? null; }

  return c.json({ data: items, next_cursor });
});

// POST /
const createRouteSpec = createRoute({
  method: 'post', path: '/', tags: ['Project Notes'],
  summary: 'Create a new note',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid(), projectId: z.string().uuid() }),
    body: { content: { 'application/json': { schema: createNoteSchema } }, required: true },
  },
  responses: {
    201: { description: 'Note created', content: { 'application/json': { schema: z.object({ data: z.any() }) } } },
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

  const { data: note, error } = await supabase.from('project_notes')
    .insert({ project_id: projectId, title: body.title, content: body.content ?? '', author_id: user.id, is_pinned: body.is_pinned ?? false, color: body.color ?? null })
    .select().single();

  if (error) return badRequest(c, error.message);
  return c.json({ data: note }, 201);
});

// PATCH /:noteId
const updateRouteSpec = createRoute({
  method: 'patch', path: '/:noteId', tags: ['Project Notes'],
  summary: 'Update a note',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid(), projectId: z.string().uuid(), noteId: z.string().uuid() }),
    body: { content: { 'application/json': { schema: updateNoteSchema } }, required: true },
  },
  responses: {
    200: { description: 'Note updated', content: { 'application/json': { schema: z.object({ data: z.any() }) } } },
    400: { description: 'Bad request' }, 401: { description: 'Unauthorized' }, 403: { description: 'Forbidden' }, 404: { description: 'Not found' },
  },
});

app.openapi(updateRouteSpec, async (c) => {
  const user = c.get('user');
  const { orgId, projectId, noteId } = c.req.valid('param');
  const body = c.req.valid('json');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  const { data: existing, error: fetchErr } = await supabase.from('project_notes')
    .select('*').eq('id', noteId).eq('project_id', projectId).maybeSingle();
  if (fetchErr) return internalError(c, fetchErr.message);
  if (!existing) return notFound(c, 'Note not found');

  const { data: note, error } = await supabase.from('project_notes').update(body).eq('id', noteId).select().single();
  if (error) return badRequest(c, error.message);

  return c.json({ data: note });
});

// DELETE /:noteId
const deleteRouteSpec = createRoute({
  method: 'delete', path: '/:noteId', tags: ['Project Notes'],
  summary: 'Delete a note',
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ orgId: z.string().uuid(), projectId: z.string().uuid(), noteId: z.string().uuid() }) },
  responses: { 200: { description: 'Note deleted' }, 401: { description: 'Unauthorized' }, 403: { description: 'Forbidden' }, 404: { description: 'Not found' } },
});

app.openapi(deleteRouteSpec, async (c) => {
  const user = c.get('user');
  const { orgId, projectId, noteId } = c.req.valid('param');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  const { data: existing, error: fetchErr } = await supabase.from('project_notes')
    .select('id').eq('id', noteId).eq('project_id', projectId).maybeSingle();
  if (fetchErr) return internalError(c, fetchErr.message);
  if (!existing) return notFound(c, 'Note not found');

  const { error } = await supabase.from('project_notes').delete().eq('id', noteId);
  if (error) return internalError(c, error.message);
  return c.json({ success: true });
});

export default app;
