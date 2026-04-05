import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { createServiceClient } from '../../lib/supabase.js';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import {
  forbidden,
  notFound,
  internalError,
} from '../../lib/errors.js';

const app = new OpenAPIHono<{ Variables: AuthVariables }>();

// Apply auth to all routes
app.use('/*', authMiddleware);

// ============================================================
// GET / - list notifications for current user
// ============================================================
const listNotificationsRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Notifications'],
  summary: 'List notifications for the current user',
  security: [{ bearerAuth: [] }],
  request: {
    query: z.object({
      cursor: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(100).default(25),
      unread_only: z
        .string()
        .optional()
        .transform((v) => v === 'true'),
    }),
  },
  responses: {
    200: {
      description: 'List of notifications',
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
  },
});

app.openapi(listNotificationsRoute, async (c) => {
  const user = c.get('user');
  const { cursor, limit, unread_only } = c.req.valid('query');
  const supabase = createServiceClient();

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (unread_only) {
    query = query.eq('is_read', false);
  }

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data: notifications, error } = await query;

  if (error) return internalError(c, error.message);

  const items = notifications ?? [];
  let next_cursor: string | null = null;

  if (items.length > limit) {
    const last = items.pop();
    next_cursor = last?.created_at ?? null;
  }

  return c.json({ data: items, next_cursor });
});

// ============================================================
// PATCH /:notificationId/read - mark single notification as read
// ============================================================
const markReadRoute = createRoute({
  method: 'patch',
  path: '/:notificationId/read',
  tags: ['Notifications'],
  summary: 'Mark a single notification as read',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ notificationId: z.string().uuid() }),
  },
  responses: {
    200: {
      description: 'Notification marked as read',
      content: { 'application/json': { schema: z.object({ data: z.any() }) } },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
});

app.openapi(markReadRoute, async (c) => {
  const user = c.get('user');
  const { notificationId } = c.req.valid('param');
  const supabase = createServiceClient();

  // Verify ownership before updating
  const { data: existing, error: fetchErr } = await supabase
    .from('notifications')
    .select('*')
    .eq('id', notificationId)
    .single();

  if (fetchErr || !existing) return notFound(c, 'Notification not found');
  if (existing.user_id !== user.id) {
    return forbidden(c, 'You do not have access to this notification');
  }

  const { data: notification, error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .select()
    .single();

  if (error) return internalError(c, error.message);

  return c.json({ data: notification });
});

// ============================================================
// POST /read-all - mark all notifications as read
// ============================================================
const markAllReadRoute = createRoute({
  method: 'post',
  path: '/read-all',
  tags: ['Notifications'],
  summary: 'Mark all notifications as read for the current user',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'All notifications marked as read',
      content: {
        'application/json': {
          schema: z.object({ data: z.object({ message: z.string() }) }),
        },
      },
    },
    401: { description: 'Unauthorized' },
  },
});

app.openapi(markAllReadRoute, async (c) => {
  const user = c.get('user');
  const supabase = createServiceClient();

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('is_read', false);

  if (error) return internalError(c, error.message);

  return c.json({ data: { message: 'All notifications marked as read' } });
});

export default app;
