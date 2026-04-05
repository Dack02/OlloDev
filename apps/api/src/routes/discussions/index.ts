import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import {
  createDiscussionSchema,
  updateDiscussionSchema,
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

function isAdminOrAbove(role: string): boolean {
  return ['owner', 'admin'].includes(role);
}

// ============================================================
// GET / — List discussions
// ============================================================
const listDiscussionsRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Discussions'],
  summary: 'List discussions for an organization',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid() }),
    query: z.object({
      category: z.string().optional(),
      tag: z.string().optional(),
      cursor: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(100).default(25),
    }),
  },
  responses: {
    200: {
      description: 'List of discussions',
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

app.openapi(listDiscussionsRoute, async (c) => {
  const user = c.get('user');
  const { orgId } = c.req.valid('param');
  const { category, tag, cursor, limit } = c.req.valid('query');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  let query = supabase
    .from('discussions')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (category) query = query.eq('category', category);
  if (tag) query = query.contains('tags', [tag]);
  if (cursor) query = query.lt('created_at', cursor);

  const { data: discussions, error } = await query;
  if (error) return internalError(c, error.message);

  const items = discussions ?? [];
  let next_cursor: string | null = null;

  if (items.length > limit) {
    const last = items.pop();
    next_cursor = last?.created_at ?? null;
  }

  return c.json({ data: items, next_cursor });
});

// ============================================================
// POST / — Create discussion
// ============================================================
const createDiscussionRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Discussions'],
  summary: 'Create a new discussion',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid() }),
    body: {
      content: { 'application/json': { schema: createDiscussionSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      description: 'Discussion created',
      content: { 'application/json': { schema: z.object({ data: z.any() }) } },
    },
    400: { description: 'Bad request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
  },
});

app.openapi(createDiscussionRoute, async (c) => {
  const user = c.get('user');
  const { orgId } = c.req.valid('param');
  const body = c.req.valid('json');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  const { data: discussion, error } = await supabase
    .from('discussions')
    .insert({
      org_id: orgId,
      author_id: user.id,
      title: body.title,
      body: body.body,
      category: body.category ?? null,
      tags: body.tags,
    })
    .select()
    .single();

  if (error) return badRequest(c, error.message);

  return c.json({ data: discussion }, 201);
});

// ============================================================
// GET /:discussionId — Get single discussion
// ============================================================
const getDiscussionRoute = createRoute({
  method: 'get',
  path: '/:discussionId',
  tags: ['Discussions'],
  summary: 'Get a single discussion',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      discussionId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'Discussion details',
      content: { 'application/json': { schema: z.object({ data: z.any() }) } },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
});

app.openapi(getDiscussionRoute, async (c) => {
  const user = c.get('user');
  const { orgId, discussionId } = c.req.valid('param');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  const { data: discussion, error } = await supabase
    .from('discussions')
    .select('*')
    .eq('id', discussionId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (error) return internalError(c, error.message);
  if (!discussion) return notFound(c, 'Discussion not found');

  return c.json({ data: discussion });
});

// ============================================================
// PATCH /:discussionId — Update discussion
// ============================================================
const updateDiscussionRoute = createRoute({
  method: 'patch',
  path: '/:discussionId',
  tags: ['Discussions'],
  summary: 'Update a discussion',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      discussionId: z.string().uuid(),
    }),
    body: {
      content: { 'application/json': { schema: updateDiscussionSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Discussion updated',
      content: { 'application/json': { schema: z.object({ data: z.any() }) } },
    },
    400: { description: 'Bad request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
});

app.openapi(updateDiscussionRoute, async (c) => {
  const user = c.get('user');
  const { orgId, discussionId } = c.req.valid('param');
  const body = c.req.valid('json');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  const { data: existing, error: fetchErr } = await supabase
    .from('discussions')
    .select('*')
    .eq('id', discussionId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (fetchErr) return internalError(c, fetchErr.message);
  if (!existing) return notFound(c, 'Discussion not found');

  const isAdmin = isAdminOrAbove(membership.role);
  const isAuthor = existing.author_id === user.id;

  if (!isAuthor && !isAdmin) {
    return forbidden(c, 'Only the author or an admin/owner can update this discussion');
  }

  // Non-admins cannot pin or lock
  const updates: Record<string, unknown> = { ...body };
  if (!isAdmin) {
    delete updates.is_pinned;
    delete updates.is_locked;
  }

  const { data: discussion, error } = await supabase
    .from('discussions')
    .update(updates)
    .eq('id', discussionId)
    .select()
    .single();

  if (error) return badRequest(c, error.message);

  return c.json({ data: discussion });
});

// ============================================================
// DELETE /:discussionId — Delete discussion
// ============================================================
const deleteDiscussionRoute = createRoute({
  method: 'delete',
  path: '/:discussionId',
  tags: ['Discussions'],
  summary: 'Delete a discussion',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      discussionId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'Discussion deleted',
      content: { 'application/json': { schema: z.object({ success: z.boolean() }) } },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
});

app.openapi(deleteDiscussionRoute, async (c) => {
  const user = c.get('user');
  const { orgId, discussionId } = c.req.valid('param');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  const { data: existing, error: fetchErr } = await supabase
    .from('discussions')
    .select('id, author_id')
    .eq('id', discussionId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (fetchErr) return internalError(c, fetchErr.message);
  if (!existing) return notFound(c, 'Discussion not found');

  if (existing.author_id !== user.id && !isAdminOrAbove(membership.role)) {
    return forbidden(c, 'Only the author or an admin/owner can delete this discussion');
  }

  const { error } = await supabase
    .from('discussions')
    .delete()
    .eq('id', discussionId);

  if (error) return internalError(c, error.message);

  return c.json({ success: true });
});

// ============================================================
// POST /:discussionId/upvote — Toggle upvote
// ============================================================
const upvoteDiscussionRoute = createRoute({
  method: 'post',
  path: '/:discussionId/upvote',
  tags: ['Discussions'],
  summary: 'Toggle upvote on a discussion',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      discussionId: z.string().uuid(),
    }),
    body: {
      content: {
        'application/json': {
          schema: z.object({ increment: z.boolean().default(true) }),
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Upvote toggled',
      content: { 'application/json': { schema: z.object({ data: z.any() }) } },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
});

app.openapi(upvoteDiscussionRoute, async (c) => {
  const user = c.get('user');
  const { orgId, discussionId } = c.req.valid('param');
  const { increment } = c.req.valid('json');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  const { data: existing, error: fetchErr } = await supabase
    .from('discussions')
    .select('id, upvotes')
    .eq('id', discussionId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (fetchErr) return internalError(c, fetchErr.message);
  if (!existing) return notFound(c, 'Discussion not found');

  const newUpvotes = Math.max(0, (existing.upvotes ?? 0) + (increment ? 1 : -1));

  const { data: discussion, error } = await supabase
    .from('discussions')
    .update({ upvotes: newUpvotes })
    .eq('id', discussionId)
    .select()
    .single();

  if (error) return internalError(c, error.message);

  return c.json({ data: discussion });
});

export default app;
