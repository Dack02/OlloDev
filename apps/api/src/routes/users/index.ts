import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { updateProfileSchema } from '@ollo-dev/shared/validators';
import { createServiceClient } from '../../lib/supabase.js';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import { badRequest, notFound, internalError } from '../../lib/errors.js';

const app = new OpenAPIHono<{ Variables: AuthVariables }>();

// Apply auth to all routes
app.use('/*', authMiddleware);

// ============================================================
// GET /me - get current user profile
// ============================================================
const getMeRoute = createRoute({
  method: 'get',
  path: '/me',
  tags: ['Users'],
  summary: 'Get the current user profile',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'User profile',
      content: { 'application/json': { schema: z.object({ data: z.any() }) } },
    },
    401: { description: 'Unauthorized' },
    404: { description: 'Profile not found' },
  },
});

app.openapi(getMeRoute, async (c) => {
  const user = c.get('user');
  const supabase = createServiceClient();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error || !profile) return notFound(c, 'Profile not found');

  return c.json({ data: { ...profile, email: user.email } });
});

// ============================================================
// PATCH /me - update profile
// ============================================================
const updateMeRoute = createRoute({
  method: 'patch',
  path: '/me',
  tags: ['Users'],
  summary: 'Update the current user profile',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: { 'application/json': { schema: updateProfileSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Profile updated',
      content: { 'application/json': { schema: z.object({ data: z.any() }) } },
    },
    400: { description: 'Bad request' },
    401: { description: 'Unauthorized' },
    404: { description: 'Profile not found' },
  },
});

app.openapi(updateMeRoute, async (c) => {
  const user = c.get('user');
  const body = c.req.valid('json');
  const supabase = createServiceClient();

  const { data: profile, error } = await supabase
    .from('profiles')
    .update(body)
    .eq('id', user.id)
    .select()
    .single();

  if (error) return badRequest(c, error.message);
  if (!profile) return notFound(c, 'Profile not found');

  return c.json({ data: profile });
});

// ============================================================
// PATCH /me/preferences - update locale/theme/timezone
// ============================================================
const preferencesSchema = updateProfileSchema.pick({
  locale: true,
  theme: true,
  timezone: true,
});

const updatePreferencesRoute = createRoute({
  method: 'patch',
  path: '/me/preferences',
  tags: ['Users'],
  summary: 'Update user preferences (locale, theme, timezone)',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: { 'application/json': { schema: preferencesSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Preferences updated',
      content: { 'application/json': { schema: z.object({ data: z.any() }) } },
    },
    400: { description: 'Bad request' },
    401: { description: 'Unauthorized' },
    404: { description: 'Profile not found' },
  },
});

app.openapi(updatePreferencesRoute, async (c) => {
  const user = c.get('user');
  const body = c.req.valid('json');
  const supabase = createServiceClient();

  const { data: profile, error } = await supabase
    .from('profiles')
    .update(body)
    .eq('id', user.id)
    .select()
    .single();

  if (error) return badRequest(c, error.message);
  if (!profile) return notFound(c, 'Profile not found');

  return c.json({ data: profile });
});

export default app;
