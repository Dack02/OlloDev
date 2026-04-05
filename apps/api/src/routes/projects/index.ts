import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import {
  createProjectSchema,
  updateProjectSchema,
} from '@ollo-dev/shared/validators';
import { createServiceClient } from '../../lib/supabase.js';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import {
  badRequest,
  forbidden,
  notFound,
  internalError,
} from '../../lib/errors.js';

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

function isAdminOrOwner(role: string): boolean {
  return ['owner', 'admin'].includes(role);
}

// ============================================================
// GET / — List projects
// ============================================================
const listProjectsRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Projects'],
  summary: 'List projects for an organization',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid() }),
    query: z.object({
      status: z.string().optional(),
      cursor: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(100).default(25),
    }),
  },
  responses: {
    200: {
      description: 'List of projects',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(z.any()),
            next_cursor: z.string().nullable(),
          }),
        },
      },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
  },
});

app.openapi(listProjectsRoute, async (c) => {
  const user = c.get('user');
  const { orgId } = c.req.valid('param');
  const { status, cursor, limit } = c.req.valid('query');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  let query = supabase
    .from('projects')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (status) query = query.eq('status', status);
  if (cursor) query = query.lt('created_at', cursor);

  const { data: projects, error } = await query;
  if (error) return internalError(c, error.message);

  const items = projects ?? [];
  let next_cursor: string | null = null;

  if (items.length > limit) {
    const last = items.pop();
    next_cursor = last?.created_at ?? null;
  }

  return c.json({ data: items, next_cursor });
});

// ============================================================
// POST / — Create project
// ============================================================
const createProjectRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Projects'],
  summary: 'Create a new project',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid() }),
    body: {
      content: { 'application/json': { schema: createProjectSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      description: 'Project created',
      content: { 'application/json': { schema: z.object({ data: z.any() }) } },
    },
    400: { description: 'Bad request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
  },
});

app.openapi(createProjectRoute, async (c) => {
  const user = c.get('user');
  const { orgId } = c.req.valid('param');
  const body = c.req.valid('json');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      org_id: orgId,
      owner_id: user.id,
      name: body.name,
      description: body.description ?? null,
      color: body.color,
      status: body.status,
    })
    .select()
    .single();

  if (error) return badRequest(c, error.message);

  return c.json({ data: project }, 201);
});

// ============================================================
// GET /:projectId — Get single project
// ============================================================
const getProjectRoute = createRoute({
  method: 'get',
  path: '/:projectId',
  tags: ['Projects'],
  summary: 'Get a single project',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      projectId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'Project details',
      content: { 'application/json': { schema: z.object({ data: z.any() }) } },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
});

app.openapi(getProjectRoute, async (c) => {
  const user = c.get('user');
  const { orgId, projectId } = c.req.valid('param');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (error) return internalError(c, error.message);
  if (!project) return notFound(c, 'Project not found');

  return c.json({ data: project });
});

// ============================================================
// PATCH /:projectId — Update project
// ============================================================
const updateProjectRoute = createRoute({
  method: 'patch',
  path: '/:projectId',
  tags: ['Projects'],
  summary: 'Update a project',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      projectId: z.string().uuid(),
    }),
    body: {
      content: { 'application/json': { schema: updateProjectSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Project updated',
      content: { 'application/json': { schema: z.object({ data: z.any() }) } },
    },
    400: { description: 'Bad request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
});

app.openapi(updateProjectRoute, async (c) => {
  const user = c.get('user');
  const { orgId, projectId } = c.req.valid('param');
  const body = c.req.valid('json');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  const { data: existing, error: fetchErr } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (fetchErr) return internalError(c, fetchErr.message);
  if (!existing) return notFound(c, 'Project not found');

  const { data: project, error } = await supabase
    .from('projects')
    .update(body)
    .eq('id', projectId)
    .select()
    .single();

  if (error) return badRequest(c, error.message);

  return c.json({ data: project });
});

// ============================================================
// DELETE /:projectId — Delete project
// ============================================================
const deleteProjectRoute = createRoute({
  method: 'delete',
  path: '/:projectId',
  tags: ['Projects'],
  summary: 'Delete a project',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      projectId: z.string().uuid(),
    }),
  },
  responses: {
    200: { description: 'Project deleted' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
});

app.openapi(deleteProjectRoute, async (c) => {
  const user = c.get('user');
  const { orgId, projectId } = c.req.valid('param');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');
  if (!isAdminOrOwner(membership.role)) {
    return forbidden(c, 'Only admins and owners can delete projects');
  }

  const { data: existing, error: fetchErr } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (fetchErr) return internalError(c, fetchErr.message);
  if (!existing) return notFound(c, 'Project not found');

  const { error } = await supabase.from('projects').delete().eq('id', projectId);
  if (error) return internalError(c, error.message);

  return c.json({ success: true });
});

export default app;
