import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import crypto from 'node:crypto';
import { createApiKeySchema } from '@ollo-dev/shared/validators';
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
// GET / — List API keys (never returns key_hash)
// ============================================================
const listApiKeysRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['API Keys'],
  summary: 'List API keys for an organization',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid() }),
  },
  responses: {
    200: {
      description: 'List of API keys',
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

app.openapi(listApiKeysRoute, async (c) => {
  const user = c.get('user');
  const { orgId } = c.req.valid('param');
  const supabase = createServiceClient();

  const membership = await verifyAdminOrAbove(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');
  if (!isAdminOrAbove(membership.role)) {
    return forbidden(c, 'Only admins and owners can manage API keys');
  }

  const { data: keys, error } = await supabase
    .from('api_keys')
    .select('id, name, key_prefix, permissions, last_used_at, expires_at, created_by, created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) return internalError(c, error.message);

  return c.json({ data: keys ?? [] });
});

// ============================================================
// POST / — Create API key (returns full key ONCE)
// ============================================================
const createApiKeyRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['API Keys'],
  summary: 'Create a new API key',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid() }),
    body: {
      content: { 'application/json': { schema: createApiKeySchema } },
      required: true,
    },
  },
  responses: {
    201: {
      description: 'API key created. The full key is returned ONCE — store it securely.',
      content: { 'application/json': { schema: z.object({ data: z.any() }) } },
    },
    400: { description: 'Bad request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
  },
});

app.openapi(createApiKeyRoute, async (c) => {
  const user = c.get('user');
  const { orgId } = c.req.valid('param');
  const body = c.req.valid('json');
  const supabase = createServiceClient();

  const membership = await verifyAdminOrAbove(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');
  if (!isAdminOrAbove(membership.role)) {
    return forbidden(c, 'Only admins and owners can manage API keys');
  }

  // Generate a random 32-byte key, hex-encoded (64 chars)
  const rawKey = crypto.randomBytes(32).toString('hex');
  // Prefix for identification without exposing the full key (first 8 chars)
  const key_prefix = rawKey.slice(0, 8);
  // Hash the key for storage
  const key_hash = crypto.createHash('sha256').update(rawKey).digest('hex');

  const { data: apiKey, error } = await supabase
    .from('api_keys')
    .insert({
      org_id: orgId,
      name: body.name,
      key_hash,
      key_prefix,
      permissions: body.permissions,
      expires_at: body.expires_at ?? null,
      created_by: user.id,
    })
    .select('id, name, key_prefix, permissions, last_used_at, expires_at, created_by, created_at')
    .single();

  if (error) return badRequest(c, error.message);

  // Return the full raw key only in this response — it cannot be retrieved again
  return c.json({ data: { ...apiKey, key: rawKey } }, 201);
});

// ============================================================
// DELETE /:keyId — Revoke API key
// ============================================================
const deleteApiKeyRoute = createRoute({
  method: 'delete',
  path: '/:keyId',
  tags: ['API Keys'],
  summary: 'Revoke an API key',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      keyId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'API key revoked',
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

app.openapi(deleteApiKeyRoute, async (c) => {
  const user = c.get('user');
  const { orgId, keyId } = c.req.valid('param');
  const supabase = createServiceClient();

  const membership = await verifyAdminOrAbove(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');
  if (!isAdminOrAbove(membership.role)) {
    return forbidden(c, 'Only admins and owners can manage API keys');
  }

  const { data: existing, error: fetchErr } = await supabase
    .from('api_keys')
    .select('id')
    .eq('id', keyId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (fetchErr) return internalError(c, fetchErr.message);
  if (!existing) return notFound(c, 'API key not found');

  const { error } = await supabase
    .from('api_keys')
    .delete()
    .eq('id', keyId);

  if (error) return internalError(c, error.message);

  return c.json({ message: 'API key revoked successfully' });
});

export default app;
