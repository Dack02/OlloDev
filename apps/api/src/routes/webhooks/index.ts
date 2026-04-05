import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import {
  createWebhookSchema,
  updateWebhookSchema,
} from '@ollo-dev/shared/validators';
import { createServiceClient } from '../../lib/supabase.js';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import {
  forbidden,
  notFound,
  badRequest,
  internalError,
} from '../../lib/errors.js';

const app = new OpenAPIHono<{ Variables: AuthVariables }>();

app.use('/*', authMiddleware);

// ============================================================
// Helpers
// ============================================================

async function verifyAdminOrAbove(orgId: string, userId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

function isAdminOrAbove(role: string): boolean {
  return ['owner', 'admin'].includes(role);
}

// ============================================================
// GET / — List webhooks
// ============================================================
const listWebhooksRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Webhooks'],
  summary: 'List webhooks for an organization',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid() }),
  },
  responses: {
    200: {
      description: 'List of webhooks',
      content: {
        'application/json': {
          schema: z.object({ data: z.array(z.any()) }),
        },
      },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
  },
});

app.openapi(listWebhooksRoute, async (c) => {
  const user = c.get('user');
  const { orgId } = c.req.valid('param');
  const supabase = createServiceClient();

  const membership = await verifyAdminOrAbove(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');
  if (!isAdminOrAbove(membership.role)) {
    return forbidden(c, 'Only admins and owners can manage webhooks');
  }

  const { data: webhooks, error } = await supabase
    .from('webhooks')
    .select('id, url, events, is_active, created_by, created_at, updated_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) return internalError(c, error.message);

  return c.json({ data: webhooks ?? [] });
});

// ============================================================
// POST / — Create webhook
// ============================================================
const createWebhookRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Webhooks'],
  summary: 'Create a webhook',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid() }),
    body: {
      content: { 'application/json': { schema: createWebhookSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      description: 'Webhook created',
      content: { 'application/json': { schema: z.object({ data: z.any() }) } },
    },
    400: { description: 'Bad request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
  },
});

app.openapi(createWebhookRoute, async (c) => {
  const user = c.get('user');
  const { orgId } = c.req.valid('param');
  const body = c.req.valid('json');
  const supabase = createServiceClient();

  const membership = await verifyAdminOrAbove(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');
  if (!isAdminOrAbove(membership.role)) {
    return forbidden(c, 'Only admins and owners can manage webhooks');
  }

  const { data: webhook, error } = await supabase
    .from('webhooks')
    .insert({
      org_id: orgId,
      url: body.url,
      events: body.events,
      secret: body.secret ?? null,
      is_active: body.is_active,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return badRequest(c, error.message);

  return c.json({ data: webhook }, 201);
});

// ============================================================
// PATCH /:webhookId — Update webhook
// ============================================================
const updateWebhookRoute = createRoute({
  method: 'patch',
  path: '/:webhookId',
  tags: ['Webhooks'],
  summary: 'Update a webhook',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      webhookId: z.string().uuid(),
    }),
    body: {
      content: { 'application/json': { schema: updateWebhookSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Webhook updated',
      content: { 'application/json': { schema: z.object({ data: z.any() }) } },
    },
    400: { description: 'Bad request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
});

app.openapi(updateWebhookRoute, async (c) => {
  const user = c.get('user');
  const { orgId, webhookId } = c.req.valid('param');
  const body = c.req.valid('json');
  const supabase = createServiceClient();

  const membership = await verifyAdminOrAbove(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');
  if (!isAdminOrAbove(membership.role)) {
    return forbidden(c, 'Only admins and owners can manage webhooks');
  }

  const { data: existing, error: fetchErr } = await supabase
    .from('webhooks')
    .select('id')
    .eq('id', webhookId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (fetchErr) return internalError(c, fetchErr.message);
  if (!existing) return notFound(c, 'Webhook not found');

  const { data: webhook, error } = await supabase
    .from('webhooks')
    .update(body)
    .eq('id', webhookId)
    .select()
    .single();

  if (error) return badRequest(c, error.message);

  return c.json({ data: webhook });
});

// ============================================================
// DELETE /:webhookId — Delete webhook
// ============================================================
const deleteWebhookRoute = createRoute({
  method: 'delete',
  path: '/:webhookId',
  tags: ['Webhooks'],
  summary: 'Delete a webhook',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      webhookId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'Webhook deleted',
      content: {
        'application/json': {
          schema: z.object({ message: z.string() }),
        },
      },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
});

app.openapi(deleteWebhookRoute, async (c) => {
  const user = c.get('user');
  const { orgId, webhookId } = c.req.valid('param');
  const supabase = createServiceClient();

  const membership = await verifyAdminOrAbove(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');
  if (!isAdminOrAbove(membership.role)) {
    return forbidden(c, 'Only admins and owners can manage webhooks');
  }

  const { data: existing, error: fetchErr } = await supabase
    .from('webhooks')
    .select('id')
    .eq('id', webhookId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (fetchErr) return internalError(c, fetchErr.message);
  if (!existing) return notFound(c, 'Webhook not found');

  const { error } = await supabase
    .from('webhooks')
    .delete()
    .eq('id', webhookId);

  if (error) return internalError(c, error.message);

  return c.json({ message: 'Webhook deleted successfully' });
});

export default app;
