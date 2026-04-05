import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { createTimeEntrySchema, updateTimeEntrySchema, timeEntryFilterSchema, startTimerSchema } from '@ollo-dev/shared/validators';
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
    .from('projects').select('id, org_id').eq('id', projectId).eq('org_id', orgId).maybeSingle();
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// GET / — List time entries
// ---------------------------------------------------------------------------
const listRoute = createRoute({
  method: 'get', path: '/', tags: ['Time Entries'],
  summary: 'List time entries for a project',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid(), projectId: z.string().uuid() }),
    query: timeEntryFilterSchema,
  },
  responses: {
    200: { description: 'List of time entries', content: { 'application/json': { schema: z.object({ data: z.array(z.any()), next_cursor: z.string().nullable() }) } } },
    401: { description: 'Unauthorized' }, 403: { description: 'Forbidden' }, 404: { description: 'Not found' },
  },
});

app.openapi(listRoute, async (c) => {
  const user = c.get('user');
  const { orgId, projectId } = c.req.valid('param');
  const { date_from, date_to, user_id, task_id, cursor, limit } = c.req.valid('query');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');
  const project = await verifyProjectBelongsToOrg(projectId, orgId);
  if (!project) return notFound(c, 'Project not found');

  let query = supabase.from('time_entries').select('*')
    .eq('project_id', projectId)
    .eq('org_id', orgId)
    .order('started_at', { ascending: false })
    .limit(limit + 1);

  if (date_from) query = query.gte('started_at', date_from);
  if (date_to) query = query.lte('started_at', date_to);
  if (user_id) query = query.eq('user_id', user_id);
  if (task_id) query = query.eq('task_id', task_id);
  if (cursor) query = query.lt('started_at', cursor);

  const { data: entries, error } = await query;
  if (error) return internalError(c, error.message);

  const items = entries ?? [];
  let next_cursor: string | null = null;
  if (items.length > limit) { const last = items.pop(); next_cursor = last?.started_at ?? null; }

  return c.json({ data: items, next_cursor });
});

// ---------------------------------------------------------------------------
// POST / — Create time entry (manual)
// ---------------------------------------------------------------------------
const createRouteSpec = createRoute({
  method: 'post', path: '/', tags: ['Time Entries'],
  summary: 'Create a time entry (manual or with timestamps)',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid(), projectId: z.string().uuid() }),
    body: { content: { 'application/json': { schema: createTimeEntrySchema } }, required: true },
  },
  responses: {
    201: { description: 'Time entry created', content: { 'application/json': { schema: z.object({ data: z.any() }) } } },
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

  const { data: entry, error } = await supabase.from('time_entries')
    .insert({
      org_id: orgId,
      project_id: projectId,
      user_id: user.id,
      task_id: body.task_id ?? null,
      description: body.description ?? null,
      started_at: body.started_at,
      ended_at: body.ended_at ?? null,
      duration_seconds: body.duration_seconds ?? null,
      is_manual: body.is_manual ?? false,
    })
    .select().single();

  if (error) return badRequest(c, error.message);
  return c.json({ data: entry }, 201);
});

// ---------------------------------------------------------------------------
// POST /start — Start a timer (auto-stops any running timer)
// ---------------------------------------------------------------------------
const startRoute = createRoute({
  method: 'post', path: '/start', tags: ['Time Entries'],
  summary: 'Start a new timer (auto-stops any running timer)',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid(), projectId: z.string().uuid() }),
    body: { content: { 'application/json': { schema: z.object({
      task_id: z.string().uuid().nullable().optional(),
      description: z.string().max(5000).nullable().optional(),
    }) } }, required: true },
  },
  responses: {
    201: { description: 'Timer started', content: { 'application/json': { schema: z.object({ data: z.any(), stopped: z.any().nullable() }) } } },
    400: { description: 'Bad request' }, 401: { description: 'Unauthorized' }, 403: { description: 'Forbidden' },
  },
});

app.openapi(startRoute, async (c) => {
  const user = c.get('user');
  const { orgId, projectId } = c.req.valid('param');
  const body = c.req.valid('json');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');
  const project = await verifyProjectBelongsToOrg(projectId, orgId);
  if (!project) return notFound(c, 'Project not found');

  // Auto-stop any running timer for this user
  let stopped = null;
  const { data: running } = await supabase.from('time_entries')
    .select('*').eq('user_id', user.id).is('ended_at', null).maybeSingle();

  if (running) {
    const now = new Date();
    const startedAt = new Date(running.started_at);
    const durationSeconds = Math.round((now.getTime() - startedAt.getTime()) / 1000);

    const { data: stoppedEntry } = await supabase.from('time_entries')
      .update({ ended_at: now.toISOString(), duration_seconds: durationSeconds })
      .eq('id', running.id).select().single();
    stopped = stoppedEntry;
  }

  // Start new timer
  const now = new Date().toISOString();
  const { data: entry, error } = await supabase.from('time_entries')
    .insert({
      org_id: orgId,
      project_id: projectId,
      user_id: user.id,
      task_id: body.task_id ?? null,
      description: body.description ?? null,
      started_at: now,
      ended_at: null,
      duration_seconds: null,
      is_manual: false,
    })
    .select().single();

  if (error) return badRequest(c, error.message);
  return c.json({ data: entry, stopped }, 201);
});

// ---------------------------------------------------------------------------
// POST /:entryId/stop — Stop a running timer
// ---------------------------------------------------------------------------
const stopRoute = createRoute({
  method: 'post', path: '/:entryId/stop', tags: ['Time Entries'],
  summary: 'Stop a running timer',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid(), projectId: z.string().uuid(), entryId: z.string().uuid() }),
  },
  responses: {
    200: { description: 'Timer stopped', content: { 'application/json': { schema: z.object({ data: z.any() }) } } },
    400: { description: 'Bad request' }, 401: { description: 'Unauthorized' }, 403: { description: 'Forbidden' }, 404: { description: 'Not found' },
  },
});

app.openapi(stopRoute, async (c) => {
  const user = c.get('user');
  const { orgId, projectId, entryId } = c.req.valid('param');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  const { data: existing, error: fetchErr } = await supabase.from('time_entries')
    .select('*').eq('id', entryId).eq('project_id', projectId).maybeSingle();
  if (fetchErr) return internalError(c, fetchErr.message);
  if (!existing) return notFound(c, 'Time entry not found');
  if (existing.ended_at) return badRequest(c, 'Timer is not running');
  if (existing.user_id !== user.id) return forbidden(c, 'You can only stop your own timer');

  const now = new Date();
  const startedAt = new Date(existing.started_at);
  const durationSeconds = Math.round((now.getTime() - startedAt.getTime()) / 1000);

  const { data: entry, error } = await supabase.from('time_entries')
    .update({ ended_at: now.toISOString(), duration_seconds: durationSeconds })
    .eq('id', entryId).select().single();

  if (error) return badRequest(c, error.message);
  return c.json({ data: entry });
});

// ---------------------------------------------------------------------------
// GET /running — Get the current user's running timer (any project)
// ---------------------------------------------------------------------------
const runningRoute = createRoute({
  method: 'get', path: '/running', tags: ['Time Entries'],
  summary: 'Get current running timer for the authenticated user',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid(), projectId: z.string().uuid() }),
  },
  responses: {
    200: { description: 'Running timer or null', content: { 'application/json': { schema: z.object({ data: z.any().nullable() }) } } },
    401: { description: 'Unauthorized' }, 403: { description: 'Forbidden' },
  },
});

app.openapi(runningRoute, async (c) => {
  const user = c.get('user');
  const { orgId } = c.req.valid('param');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  const { data: running, error } = await supabase.from('time_entries')
    .select('*, projects!inner(name, color)')
    .eq('user_id', user.id)
    .eq('org_id', orgId)
    .is('ended_at', null)
    .maybeSingle();

  if (error) return internalError(c, error.message);
  return c.json({ data: running });
});

// ---------------------------------------------------------------------------
// PATCH /:entryId — Update a time entry
// ---------------------------------------------------------------------------
const updateRouteSpec = createRoute({
  method: 'patch', path: '/:entryId', tags: ['Time Entries'],
  summary: 'Update a time entry',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid(), projectId: z.string().uuid(), entryId: z.string().uuid() }),
    body: { content: { 'application/json': { schema: updateTimeEntrySchema } }, required: true },
  },
  responses: {
    200: { description: 'Time entry updated', content: { 'application/json': { schema: z.object({ data: z.any() }) } } },
    400: { description: 'Bad request' }, 401: { description: 'Unauthorized' }, 403: { description: 'Forbidden' }, 404: { description: 'Not found' },
  },
});

app.openapi(updateRouteSpec, async (c) => {
  const user = c.get('user');
  const { orgId, projectId, entryId } = c.req.valid('param');
  const body = c.req.valid('json');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  const { data: existing, error: fetchErr } = await supabase.from('time_entries')
    .select('*').eq('id', entryId).eq('project_id', projectId).maybeSingle();
  if (fetchErr) return internalError(c, fetchErr.message);
  if (!existing) return notFound(c, 'Time entry not found');

  const { data: entry, error } = await supabase.from('time_entries').update(body).eq('id', entryId).select().single();
  if (error) return badRequest(c, error.message);

  return c.json({ data: entry });
});

// ---------------------------------------------------------------------------
// DELETE /:entryId — Delete a time entry
// ---------------------------------------------------------------------------
const deleteRouteSpec = createRoute({
  method: 'delete', path: '/:entryId', tags: ['Time Entries'],
  summary: 'Delete a time entry',
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ orgId: z.string().uuid(), projectId: z.string().uuid(), entryId: z.string().uuid() }) },
  responses: { 200: { description: 'Time entry deleted' }, 401: { description: 'Unauthorized' }, 403: { description: 'Forbidden' }, 404: { description: 'Not found' } },
});

app.openapi(deleteRouteSpec, async (c) => {
  const user = c.get('user');
  const { orgId, projectId, entryId } = c.req.valid('param');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  const { data: existing, error: fetchErr } = await supabase.from('time_entries')
    .select('id').eq('id', entryId).eq('project_id', projectId).maybeSingle();
  if (fetchErr) return internalError(c, fetchErr.message);
  if (!existing) return notFound(c, 'Time entry not found');

  const { error } = await supabase.from('time_entries').delete().eq('id', entryId);
  if (error) return internalError(c, error.message);
  return c.json({ success: true });
});

export default app;
