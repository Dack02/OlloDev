import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { createProjectTicketSchema, updateProjectTicketSchema } from '@ollo-dev/shared/validators';
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
  method: 'get', path: '/', tags: ['Project Tickets'], summary: 'List project tickets',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid(), projectId: z.string().uuid() }),
    query: z.object({ status: z.string().optional(), cursor: z.string().optional(), limit: z.coerce.number().int().min(1).max(100).default(50) }),
  },
  responses: { 200: { description: 'List', content: { 'application/json': { schema: z.object({ data: z.array(z.any()), next_cursor: z.string().nullable() }) } } }, 401: { description: 'Unauthorized' }, 403: { description: 'Forbidden' } },
});

app.openapi(listRoute, async (c) => {
  const user = c.get('user');
  const { orgId, projectId } = c.req.valid('param');
  const { status, cursor, limit } = c.req.valid('query');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'Not a member');
  const project = await verifyProjectBelongsToOrg(projectId, orgId);
  if (!project) return notFound(c, 'Project not found');

  let query = supabase.from('project_tickets').select('*').eq('project_id', projectId).order('created_at', { ascending: false }).limit(limit + 1);
  if (status) query = query.eq('status', status);
  if (cursor) query = query.lt('created_at', cursor);

  const { data: tickets, error } = await query;
  if (error) return internalError(c, error.message);
  const items = tickets ?? [];
  let next_cursor: string | null = null;
  if (items.length > limit) { const last = items.pop(); next_cursor = last?.created_at ?? null; }
  return c.json({ data: items, next_cursor });
});

// POST /
const createRouteSpec = createRoute({
  method: 'post', path: '/', tags: ['Project Tickets'], summary: 'Create a project ticket',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid(), projectId: z.string().uuid() }),
    body: { content: { 'application/json': { schema: createProjectTicketSchema } }, required: true },
  },
  responses: { 201: { description: 'Created', content: { 'application/json': { schema: z.object({ data: z.any() }) } } }, 400: { description: 'Bad request' }, 401: { description: 'Unauthorized' }, 403: { description: 'Forbidden' } },
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

  const { data: ticket, error } = await supabase.from('project_tickets')
    .insert({ project_id: projectId, title: body.title, description: body.description ?? null, priority: body.priority, type: body.type, requester_name: body.requester_name ?? null, requester_email: body.requester_email ?? null, assignee_id: body.assignee_id ?? null })
    .select().single();
  if (error) return badRequest(c, error.message);
  return c.json({ data: ticket }, 201);
});

// PATCH /:ticketId
const updateRouteSpec = createRoute({
  method: 'patch', path: '/:ticketId', tags: ['Project Tickets'], summary: 'Update a project ticket',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid(), projectId: z.string().uuid(), ticketId: z.string().uuid() }),
    body: { content: { 'application/json': { schema: updateProjectTicketSchema } }, required: true },
  },
  responses: { 200: { description: 'Updated', content: { 'application/json': { schema: z.object({ data: z.any() }) } } }, 400: { description: 'Bad request' }, 404: { description: 'Not found' } },
});

app.openapi(updateRouteSpec, async (c) => {
  const user = c.get('user');
  const { orgId, projectId, ticketId } = c.req.valid('param');
  const body = c.req.valid('json');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'Not a member');

  const { data: existing } = await supabase.from('project_tickets').select('id').eq('id', ticketId).eq('project_id', projectId).maybeSingle();
  if (!existing) return notFound(c, 'Ticket not found');

  const { data: ticket, error } = await supabase.from('project_tickets').update(body).eq('id', ticketId).select().single();
  if (error) return badRequest(c, error.message);
  return c.json({ data: ticket });
});

// DELETE /:ticketId
const deleteRouteSpec = createRoute({
  method: 'delete', path: '/:ticketId', tags: ['Project Tickets'], summary: 'Delete a project ticket',
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ orgId: z.string().uuid(), projectId: z.string().uuid(), ticketId: z.string().uuid() }) },
  responses: { 200: { description: 'Deleted' }, 404: { description: 'Not found' } },
});

app.openapi(deleteRouteSpec, async (c) => {
  const user = c.get('user');
  const { orgId, projectId, ticketId } = c.req.valid('param');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'Not a member');

  const { data: existing } = await supabase.from('project_tickets').select('id').eq('id', ticketId).eq('project_id', projectId).maybeSingle();
  if (!existing) return notFound(c, 'Ticket not found');

  const { error } = await supabase.from('project_tickets').delete().eq('id', ticketId);
  if (error) return internalError(c, error.message);
  return c.json({ success: true });
});

export default app;
