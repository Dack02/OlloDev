import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { createDiscussionReplySchema } from '@ollo-dev/shared/validators';
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
// GET / — List replies
// ============================================================
const listRepliesRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Discussion Replies'],
  summary: 'List replies for a discussion',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      discussionId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'List of replies',
      content: {
        'application/json': {
          schema: z.object({ data: z.array(z.any()) }),
        },
      },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
});

app.openapi(listRepliesRoute, async (c) => {
  const user = c.get('user');
  const { orgId, discussionId } = c.req.valid('param');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  // Verify the discussion belongs to this org
  const { data: discussion, error: discErr } = await supabase
    .from('discussions')
    .select('id')
    .eq('id', discussionId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (discErr) return internalError(c, discErr.message);
  if (!discussion) return notFound(c, 'Discussion not found');

  const { data: replies, error } = await supabase
    .from('discussion_replies')
    .select('*')
    .eq('discussion_id', discussionId)
    .order('created_at', { ascending: true });

  if (error) return internalError(c, error.message);

  return c.json({ data: replies ?? [] });
});

// ============================================================
// POST / — Create reply
// ============================================================
const createReplyRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Discussion Replies'],
  summary: 'Create a reply on a discussion',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      discussionId: z.string().uuid(),
    }),
    body: {
      content: { 'application/json': { schema: createDiscussionReplySchema } },
      required: true,
    },
  },
  responses: {
    201: {
      description: 'Reply created',
      content: { 'application/json': { schema: z.object({ data: z.any() }) } },
    },
    400: { description: 'Bad request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
});

app.openapi(createReplyRoute, async (c) => {
  const user = c.get('user');
  const { orgId, discussionId } = c.req.valid('param');
  const body = c.req.valid('json');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  // Verify discussion exists in this org and is not locked
  const { data: discussion, error: discErr } = await supabase
    .from('discussions')
    .select('id, is_locked, reply_count, status')
    .eq('id', discussionId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (discErr) return internalError(c, discErr.message);
  if (!discussion) return notFound(c, 'Discussion not found');
  if (discussion.status === 'archived') {
    return forbidden(c, 'This discussion is archived');
  }
  if ((discussion.is_locked || discussion.status === 'closed') && !isAdminOrAbove(membership.role)) {
    return forbidden(c, 'This discussion is closed');
  }

  const { data: reply, error } = await supabase
    .from('discussion_replies')
    .insert({
      discussion_id: discussionId,
      author_id: user.id,
      body: body.body,
      parent_id: body.parent_id ?? null,
    })
    .select()
    .single();

  if (error) return badRequest(c, error.message);

  // Increment reply_count on the discussion
  await supabase
    .from('discussions')
    .update({ reply_count: (discussion.reply_count ?? 0) + 1 })
    .eq('id', discussionId);

  return c.json({ data: reply }, 201);
});

// ============================================================
// PATCH /:replyId — Edit reply
// ============================================================
const updateReplyRoute = createRoute({
  method: 'patch',
  path: '/:replyId',
  tags: ['Discussion Replies'],
  summary: 'Edit a reply',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      discussionId: z.string().uuid(),
      replyId: z.string().uuid(),
    }),
    body: {
      content: {
        'application/json': {
          schema: z.object({ body: z.string().min(1).max(50000) }),
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Reply updated',
      content: { 'application/json': { schema: z.object({ data: z.any() }) } },
    },
    400: { description: 'Bad request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
});

app.openapi(updateReplyRoute, async (c) => {
  const user = c.get('user');
  const { orgId, discussionId, replyId } = c.req.valid('param');
  const { body: bodyText } = c.req.valid('json');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  const { data: reply, error: fetchErr } = await supabase
    .from('discussion_replies')
    .select('*')
    .eq('id', replyId)
    .eq('discussion_id', discussionId)
    .maybeSingle();

  if (fetchErr) return internalError(c, fetchErr.message);
  if (!reply) return notFound(c, 'Reply not found');

  if (reply.author_id !== user.id) {
    return forbidden(c, 'Only the author can edit this reply');
  }

  const { data: updated, error } = await supabase
    .from('discussion_replies')
    .update({ body: bodyText })
    .eq('id', replyId)
    .select()
    .single();

  if (error) return badRequest(c, error.message);

  return c.json({ data: updated });
});

// ============================================================
// DELETE /:replyId — Delete reply
// ============================================================
const deleteReplyRoute = createRoute({
  method: 'delete',
  path: '/:replyId',
  tags: ['Discussion Replies'],
  summary: 'Delete a reply',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      discussionId: z.string().uuid(),
      replyId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'Reply deleted',
      content: { 'application/json': { schema: z.object({ success: z.boolean() }) } },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
});

app.openapi(deleteReplyRoute, async (c) => {
  const user = c.get('user');
  const { orgId, discussionId, replyId } = c.req.valid('param');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  const { data: reply, error: fetchErr } = await supabase
    .from('discussion_replies')
    .select('id, author_id')
    .eq('id', replyId)
    .eq('discussion_id', discussionId)
    .maybeSingle();

  if (fetchErr) return internalError(c, fetchErr.message);
  if (!reply) return notFound(c, 'Reply not found');

  if (reply.author_id !== user.id && !isAdminOrAbove(membership.role)) {
    return forbidden(c, 'Only the author or an admin/owner can delete this reply');
  }

  const { error } = await supabase
    .from('discussion_replies')
    .delete()
    .eq('id', replyId);

  if (error) return internalError(c, error.message);

  // Decrement reply_count on the parent discussion
  const { data: discussion } = await supabase
    .from('discussions')
    .select('reply_count')
    .eq('id', discussionId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (discussion) {
    await supabase
      .from('discussions')
      .update({ reply_count: Math.max(0, (discussion.reply_count ?? 1) - 1) })
      .eq('id', discussionId);
  }

  return c.json({ success: true });
});

// ============================================================
// POST /:replyId/accept — Mark as accepted answer
// ============================================================
const acceptReplyRoute = createRoute({
  method: 'post',
  path: '/:replyId/accept',
  tags: ['Discussion Replies'],
  summary: 'Mark a reply as the accepted answer',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      discussionId: z.string().uuid(),
      replyId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'Reply accepted',
      content: { 'application/json': { schema: z.object({ data: z.any() }) } },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
});

app.openapi(acceptReplyRoute, async (c) => {
  const user = c.get('user');
  const { orgId, discussionId, replyId } = c.req.valid('param');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  // Fetch the discussion to check authorship
  const { data: discussion, error: discErr } = await supabase
    .from('discussions')
    .select('id, author_id')
    .eq('id', discussionId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (discErr) return internalError(c, discErr.message);
  if (!discussion) return notFound(c, 'Discussion not found');

  const isDiscussionAuthor = discussion.author_id === user.id;
  if (!isDiscussionAuthor && !isAdminOrAbove(membership.role)) {
    return forbidden(c, 'Only the discussion author or an admin/owner can accept a reply');
  }

  // Verify the reply belongs to this discussion
  const { data: reply, error: replyErr } = await supabase
    .from('discussion_replies')
    .select('id')
    .eq('id', replyId)
    .eq('discussion_id', discussionId)
    .maybeSingle();

  if (replyErr) return internalError(c, replyErr.message);
  if (!reply) return notFound(c, 'Reply not found');

  // Unset any previously accepted reply in this discussion
  await supabase
    .from('discussion_replies')
    .update({ is_accepted: false })
    .eq('discussion_id', discussionId)
    .eq('is_accepted', true);

  // Mark this reply as accepted
  const { data: accepted, error } = await supabase
    .from('discussion_replies')
    .update({ is_accepted: true })
    .eq('id', replyId)
    .select()
    .single();

  if (error) return internalError(c, error.message);

  return c.json({ data: accepted });
});

export default app;
