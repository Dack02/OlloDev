import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import {
  createQueueSchema,
  createSlaPolicySchema,
  createCannedResponseSchema,
  updateCannedResponseSchema,
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
// GET /queues — List ticket queues
// ============================================================
const listQueuesRoute = createRoute({
  method: 'get',
  path: '/queues',
  tags: ['Ticket Config'],
  summary: 'List ticket queues for an organization',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid() }),
  },
  responses: {
    200: {
      description: 'List of queues',
      content: { 'application/json': { schema: z.object({ data: z.array(z.any()) }) } },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
  },
});

app.openapi(listQueuesRoute, async (c) => {
  const user = c.get('user');
  const { orgId } = c.req.valid('param');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  const { data: queues, error } = await supabase
    .from('ticket_queues')
    .select('*')
    .eq('org_id', orgId)
    .order('name', { ascending: true });

  if (error) return internalError(c, error.message);

  return c.json({ data: queues ?? [] });
});

// ============================================================
// POST /queues — Create queue (admin/owner only)
// ============================================================
const createQueueRoute = createRoute({
  method: 'post',
  path: '/queues',
  tags: ['Ticket Config'],
  summary: 'Create a ticket queue (admin/owner only)',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid() }),
    body: {
      content: { 'application/json': { schema: createQueueSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      description: 'Queue created',
      content: { 'application/json': { schema: z.object({ data: z.any() }) } },
    },
    400: { description: 'Bad request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
  },
});

app.openapi(createQueueRoute, async (c) => {
  const user = c.get('user');
  const { orgId } = c.req.valid('param');
  const body = c.req.valid('json');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');
  if (!isAdminOrOwner(membership.role)) {
    return forbidden(c, 'Only admins and owners can create queues');
  }

  const { data: queue, error } = await supabase
    .from('ticket_queues')
    .insert({
      org_id: orgId,
      name: body.name,
      slug: body.slug,
      description: body.description ?? null,
      color: body.color ?? null,
      sla_policy_id: body.sla_policy_id ?? null,
      auto_assign: body.auto_assign,
    })
    .select()
    .single();

  if (error) return badRequest(c, error.message);

  return c.json({ data: queue }, 201);
});

// ============================================================
// GET /sla-policies — List SLA policies
// ============================================================
const listSlaPoliciesRoute = createRoute({
  method: 'get',
  path: '/sla-policies',
  tags: ['Ticket Config'],
  summary: 'List SLA policies for an organization',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid() }),
  },
  responses: {
    200: {
      description: 'List of SLA policies',
      content: { 'application/json': { schema: z.object({ data: z.array(z.any()) }) } },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
  },
});

app.openapi(listSlaPoliciesRoute, async (c) => {
  const user = c.get('user');
  const { orgId } = c.req.valid('param');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  const { data: policies, error } = await supabase
    .from('sla_policies')
    .select('*')
    .eq('org_id', orgId)
    .order('name', { ascending: true });

  if (error) return internalError(c, error.message);

  return c.json({ data: policies ?? [] });
});

// ============================================================
// POST /sla-policies — Create SLA policy (admin/owner only)
// ============================================================
const createSlaPolicyRoute = createRoute({
  method: 'post',
  path: '/sla-policies',
  tags: ['Ticket Config'],
  summary: 'Create an SLA policy (admin/owner only)',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid() }),
    body: {
      content: { 'application/json': { schema: createSlaPolicySchema } },
      required: true,
    },
  },
  responses: {
    201: {
      description: 'SLA policy created',
      content: { 'application/json': { schema: z.object({ data: z.any() }) } },
    },
    400: { description: 'Bad request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
  },
});

app.openapi(createSlaPolicyRoute, async (c) => {
  const user = c.get('user');
  const { orgId } = c.req.valid('param');
  const body = c.req.valid('json');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');
  if (!isAdminOrOwner(membership.role)) {
    return forbidden(c, 'Only admins and owners can create SLA policies');
  }

  const { data: policy, error } = await supabase
    .from('sla_policies')
    .insert({
      org_id: orgId,
      name: body.name,
      description: body.description ?? null,
      response_times: body.response_times,
      resolution_times: body.resolution_times,
      business_hours: body.business_hours ?? false,
      is_default: body.is_default,
    })
    .select()
    .single();

  if (error) return badRequest(c, error.message);

  return c.json({ data: policy }, 201);
});

// ============================================================
// GET /canned-responses — List canned responses
// ============================================================
const listCannedResponsesRoute = createRoute({
  method: 'get',
  path: '/canned-responses',
  tags: ['Ticket Config'],
  summary: "List canned responses (shared + user's own)",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid() }),
  },
  responses: {
    200: {
      description: 'List of canned responses',
      content: { 'application/json': { schema: z.object({ data: z.array(z.any()) }) } },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
  },
});

app.openapi(listCannedResponsesRoute, async (c) => {
  const user = c.get('user');
  const { orgId } = c.req.valid('param');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  // Return shared responses + user's own private responses
  const { data: responses, error } = await supabase
    .from('canned_responses')
    .select('*')
    .eq('org_id', orgId)
    .or(`is_shared.eq.true,created_by.eq.${user.id}`)
    .order('title', { ascending: true });

  if (error) return internalError(c, error.message);

  return c.json({ data: responses ?? [] });
});

// ============================================================
// POST /canned-responses — Create canned response
// ============================================================
const createCannedResponseRoute = createRoute({
  method: 'post',
  path: '/canned-responses',
  tags: ['Ticket Config'],
  summary: 'Create a canned response',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid() }),
    body: {
      content: { 'application/json': { schema: createCannedResponseSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      description: 'Canned response created',
      content: { 'application/json': { schema: z.object({ data: z.any() }) } },
    },
    400: { description: 'Bad request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
  },
});

app.openapi(createCannedResponseRoute, async (c) => {
  const user = c.get('user');
  const { orgId } = c.req.valid('param');
  const body = c.req.valid('json');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  const { data: response, error } = await supabase
    .from('canned_responses')
    .insert({
      org_id: orgId,
      created_by: user.id,
      title: body.title,
      content: body.content,
      category: body.category ?? null,
      shortcut: body.shortcut ?? null,
      is_shared: body.is_shared,
    })
    .select()
    .single();

  if (error) return badRequest(c, error.message);

  return c.json({ data: response }, 201);
});

// ============================================================
// PATCH /canned-responses/:responseId — Update canned response
// ============================================================
const updateCannedResponseRoute = createRoute({
  method: 'patch',
  path: '/canned-responses/:responseId',
  tags: ['Ticket Config'],
  summary: 'Update a canned response',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      responseId: z.string().uuid(),
    }),
    body: {
      content: { 'application/json': { schema: updateCannedResponseSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Canned response updated',
      content: { 'application/json': { schema: z.object({ data: z.any() }) } },
    },
    400: { description: 'Bad request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
});

app.openapi(updateCannedResponseRoute, async (c) => {
  const user = c.get('user');
  const { orgId, responseId } = c.req.valid('param');
  const body = c.req.valid('json');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  const { data: existing, error: fetchErr } = await supabase
    .from('canned_responses')
    .select('id, created_by, is_shared')
    .eq('id', responseId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (fetchErr) return internalError(c, fetchErr.message);
  if (!existing) return notFound(c, 'Canned response not found');

  // Users can update their own; admins/owners can update shared ones too
  const isOwnerOfResponse = existing.created_by === user.id;
  const canEditShared = isAdminOrOwner(membership.role);

  if (!isOwnerOfResponse && !canEditShared) {
    return forbidden(c, 'You do not have permission to update this canned response');
  }

  const { data: updated, error } = await supabase
    .from('canned_responses')
    .update(body)
    .eq('id', responseId)
    .select()
    .single();

  if (error) return badRequest(c, error.message);

  return c.json({ data: updated });
});

export default app;
