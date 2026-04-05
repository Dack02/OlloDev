import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import {
  createBugSchema,
  updateBugSchema,
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

async function verifyProjectBelongsToOrg(projectId: string, orgId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('org_id', orgId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ============================================================
// GET / — List bugs for a project
// ============================================================
const listBugsRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Project Bugs'],
  summary: 'List bugs for a project',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      projectId: z.string().uuid(),
    }),
    query: z.object({
      status: z.string().optional(),
      priority: z.string().optional(),
      severity: z.string().optional(),
      assignee_id: z.string().uuid().optional(),
      cursor: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(100).default(50),
    }),
  },
  responses: {
    200: {
      description: 'List of bugs',
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
    404: { description: 'Not found' },
  },
});

app.openapi(listBugsRoute, async (c) => {
  const user = c.get('user');
  const { orgId, projectId } = c.req.valid('param');
  const { status, priority, severity, assignee_id, cursor, limit } = c.req.valid('query');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  const project = await verifyProjectBelongsToOrg(projectId, orgId);
  if (!project) return notFound(c, 'Project not found');

  let query = supabase
    .from('project_bugs')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (status) query = query.eq('status', status);
  if (priority) query = query.eq('priority', priority);
  if (severity) query = query.eq('severity', severity);
  if (assignee_id) query = query.eq('assignee_id', assignee_id);
  if (cursor) query = query.lt('created_at', cursor);

  const { data: bugs, error } = await query;
  if (error) return internalError(c, error.message);

  const items = bugs ?? [];
  let next_cursor: string | null = null;

  if (items.length > limit) {
    const last = items.pop();
    next_cursor = last?.created_at ?? null;
  }

  return c.json({ data: items, next_cursor });
});

// ============================================================
// POST / — Create bug
// ============================================================
const createBugRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Project Bugs'],
  summary: 'Create a new bug',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      projectId: z.string().uuid(),
    }),
    body: {
      content: { 'application/json': { schema: createBugSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      description: 'Bug created',
      content: { 'application/json': { schema: z.object({ data: z.any() }) } },
    },
    400: { description: 'Bad request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
});

app.openapi(createBugRoute, async (c) => {
  const user = c.get('user');
  const { orgId, projectId } = c.req.valid('param');
  const body = c.req.valid('json');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  const project = await verifyProjectBelongsToOrg(projectId, orgId);
  if (!project) return notFound(c, 'Project not found');

  const { data: bug, error } = await supabase
    .from('project_bugs')
    .insert({
      project_id: projectId,
      reporter_id: user.id,
      title: body.title,
      description: body.description ?? null,
      priority: body.priority,
      severity: body.severity,
      assignee_id: body.assignee_id ?? null,
      labels: body.labels,
    })
    .select()
    .single();

  if (error) return badRequest(c, error.message);

  // Auto-create a linked discussion thread
  const { data: discussion } = await supabase
    .from('discussions')
    .insert({
      org_id: orgId,
      project_id: projectId,
      author_id: user.id,
      title: `[Bug] ${body.title}`,
      body: body.description || `Discussion thread for bug: ${body.title}`,
      category: 'bugs',
      tags: ['bug', 'auto-thread'],
      source_type: 'bug',
      source_id: bug.id,
    })
    .select('id')
    .single();

  if (discussion) {
    const { data: updated } = await supabase
      .from('project_bugs')
      .update({ discussion_id: discussion.id })
      .eq('id', bug.id)
      .select()
      .single();

    return c.json({ data: updated ?? { ...bug, discussion_id: discussion.id } }, 201);
  }

  return c.json({ data: bug }, 201);
});

// ============================================================
// GET /:bugId — Get single bug
// ============================================================
const getBugRoute = createRoute({
  method: 'get',
  path: '/:bugId',
  tags: ['Project Bugs'],
  summary: 'Get a single bug',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      projectId: z.string().uuid(),
      bugId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'Bug details',
      content: { 'application/json': { schema: z.object({ data: z.any() }) } },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
});

app.openapi(getBugRoute, async (c) => {
  const user = c.get('user');
  const { orgId, projectId, bugId } = c.req.valid('param');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  const { data: bug, error } = await supabase
    .from('project_bugs')
    .select('*')
    .eq('id', bugId)
    .eq('project_id', projectId)
    .maybeSingle();

  if (error) return internalError(c, error.message);
  if (!bug) return notFound(c, 'Bug not found');

  return c.json({ data: bug });
});

// ============================================================
// PATCH /:bugId — Update bug (status, priority, assignee, etc.)
// ============================================================
const updateBugRoute = createRoute({
  method: 'patch',
  path: '/:bugId',
  tags: ['Project Bugs'],
  summary: 'Update a bug',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      projectId: z.string().uuid(),
      bugId: z.string().uuid(),
    }),
    body: {
      content: { 'application/json': { schema: updateBugSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Bug updated',
      content: { 'application/json': { schema: z.object({ data: z.any() }) } },
    },
    400: { description: 'Bad request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
});

app.openapi(updateBugRoute, async (c) => {
  const user = c.get('user');
  const { orgId, projectId, bugId } = c.req.valid('param');
  const body = c.req.valid('json');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  const { data: existing, error: fetchErr } = await supabase
    .from('project_bugs')
    .select('*')
    .eq('id', bugId)
    .eq('project_id', projectId)
    .maybeSingle();

  if (fetchErr) return internalError(c, fetchErr.message);
  if (!existing) return notFound(c, 'Bug not found');

  const { data: bug, error } = await supabase
    .from('project_bugs')
    .update(body)
    .eq('id', bugId)
    .select()
    .single();

  if (error) return badRequest(c, error.message);

  // Auto-close linked discussion when bug reaches terminal status
  if (body.status && ['fixed', 'closed'].includes(body.status) && existing.discussion_id) {
    await supabase
      .from('discussions')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        closed_by: user.id,
        close_reason: `Auto-closed: linked bug marked as ${body.status}`,
      })
      .eq('id', existing.discussion_id)
      .eq('status', 'open');
  }

  return c.json({ data: bug });
});

// ============================================================
// DELETE /:bugId — Delete bug
// ============================================================
const deleteBugRoute = createRoute({
  method: 'delete',
  path: '/:bugId',
  tags: ['Project Bugs'],
  summary: 'Delete a bug',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      projectId: z.string().uuid(),
      bugId: z.string().uuid(),
    }),
  },
  responses: {
    200: { description: 'Bug deleted' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
});

app.openapi(deleteBugRoute, async (c) => {
  const user = c.get('user');
  const { orgId, projectId, bugId } = c.req.valid('param');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  const { data: existing, error: fetchErr } = await supabase
    .from('project_bugs')
    .select('id')
    .eq('id', bugId)
    .eq('project_id', projectId)
    .maybeSingle();

  if (fetchErr) return internalError(c, fetchErr.message);
  if (!existing) return notFound(c, 'Bug not found');

  const { error } = await supabase.from('project_bugs').delete().eq('id', bugId);
  if (error) return internalError(c, error.message);

  return c.json({ success: true });
});

export default app;
