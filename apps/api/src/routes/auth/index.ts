import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@ollo-dev/shared/validators';
import { createServiceClient } from '../../lib/supabase.js';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import { badRequest, unauthorized, internalError } from '../../lib/errors.js';

const app = new OpenAPIHono<{ Variables: AuthVariables }>();

// ============================================================
// POST /signup
// ============================================================
const signupRoute = createRoute({
  method: 'post',
  path: '/signup',
  tags: ['Auth'],
  summary: 'Sign up with email and password',
  request: {
    body: {
      content: { 'application/json': { schema: signupSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Signup successful',
      content: { 'application/json': { schema: z.object({ data: z.any() }) } },
    },
    400: { description: 'Bad request' },
  },
});

app.openapi(signupRoute, async (c) => {
  const body = c.req.valid('json');
  const supabase = createServiceClient();

  const { data, error } = await supabase.auth.signUp({
    email: body.email,
    password: body.password,
    options: {
      data: { display_name: body.display_name },
    },
  });

  if (error) return badRequest(c, error.message);

  return c.json({ data });
});

// ============================================================
// POST /login
// ============================================================
const loginRoute = createRoute({
  method: 'post',
  path: '/login',
  tags: ['Auth'],
  summary: 'Log in with email and password',
  request: {
    body: {
      content: { 'application/json': { schema: loginSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Login successful',
      content: { 'application/json': { schema: z.object({ data: z.any() }) } },
    },
    400: { description: 'Bad request' },
    401: { description: 'Invalid credentials' },
  },
});

app.openapi(loginRoute, async (c) => {
  const body = c.req.valid('json');
  const supabase = createServiceClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: body.email,
    password: body.password,
  });

  if (error) return unauthorized(c, error.message);

  return c.json({ data });
});

// ============================================================
// POST /logout
// ============================================================
const logoutRoute = createRoute({
  method: 'post',
  path: '/logout',
  tags: ['Auth'],
  summary: 'Log out the current user',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Logout successful',
      content: { 'application/json': { schema: z.object({ data: z.object({ message: z.string() }) }) } },
    },
    401: { description: 'Unauthorized' },
  },
});

app.use('/logout', authMiddleware);
app.openapi(logoutRoute, async (c) => {
  const token = c.get('accessToken');
  const supabase = createServiceClient();

  await supabase.auth.admin.signOut(token);

  return c.json({ data: { message: 'Logged out successfully' } });
});

// ============================================================
// POST /refresh
// ============================================================
const refreshSchema = z.object({ refresh_token: z.string().min(1) });

const refreshRoute = createRoute({
  method: 'post',
  path: '/refresh',
  tags: ['Auth'],
  summary: 'Refresh the access token',
  request: {
    body: {
      content: { 'application/json': { schema: refreshSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Token refreshed',
      content: { 'application/json': { schema: z.object({ data: z.any() }) } },
    },
    400: { description: 'Bad request' },
  },
});

app.openapi(refreshRoute, async (c) => {
  const body = c.req.valid('json');
  const supabase = createServiceClient();

  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: body.refresh_token,
  });

  if (error) return badRequest(c, error.message);

  return c.json({ data });
});

// ============================================================
// POST /forgot-password
// ============================================================
const forgotPasswordRoute = createRoute({
  method: 'post',
  path: '/forgot-password',
  tags: ['Auth'],
  summary: 'Send a password reset email',
  request: {
    body: {
      content: { 'application/json': { schema: forgotPasswordSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Reset email sent if account exists',
      content: { 'application/json': { schema: z.object({ data: z.object({ message: z.string() }) }) } },
    },
    400: { description: 'Bad request' },
  },
});

app.openapi(forgotPasswordRoute, async (c) => {
  const body = c.req.valid('json');
  const supabase = createServiceClient();

  const { error } = await supabase.auth.resetPasswordForEmail(body.email);

  if (error) return badRequest(c, error.message);

  return c.json({ data: { message: 'If that email exists, a reset link has been sent.' } });
});

// ============================================================
// POST /reset-password
// ============================================================
const resetPasswordRoute = createRoute({
  method: 'post',
  path: '/reset-password',
  tags: ['Auth'],
  summary: 'Reset password for the authenticated user',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: { 'application/json': { schema: resetPasswordSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Password updated',
      content: { 'application/json': { schema: z.object({ data: z.object({ message: z.string() }) }) } },
    },
    400: { description: 'Bad request' },
    401: { description: 'Unauthorized' },
  },
});

app.use('/reset-password', authMiddleware);
app.openapi(resetPasswordRoute, async (c) => {
  const body = c.req.valid('json');
  const token = c.get('accessToken');
  const supabase = createServiceClient();

  // Set the session to the user's access token before updating
  await supabase.auth.setSession({ access_token: token, refresh_token: '' });

  const { error } = await supabase.auth.updateUser({ password: body.password });

  if (error) return badRequest(c, error.message);

  return c.json({ data: { message: 'Password updated successfully' } });
});

export default app;
