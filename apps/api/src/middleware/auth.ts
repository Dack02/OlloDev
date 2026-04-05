import type { MiddlewareHandler } from 'hono';
import type { User } from '@supabase/supabase-js';
import { createServiceClient } from '../lib/supabase.js';
import { unauthorized } from '../lib/errors.js';

export type AuthVariables = {
  user: User;
  accessToken: string;
};

export const authMiddleware: MiddlewareHandler<{ Variables: AuthVariables }> = async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorized(c, 'Missing or invalid Authorization header');
  }

  const token = authHeader.slice(7);

  if (!token) {
    return unauthorized(c, 'Missing bearer token');
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return unauthorized(c, 'Invalid or expired token');
  }

  c.set('user', data.user);
  c.set('accessToken', token);

  await next();
};
