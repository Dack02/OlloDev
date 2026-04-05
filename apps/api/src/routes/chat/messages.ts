import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import {
  createMessageSchema,
  updateMessageSchema,
  addReactionSchema,
} from '@ollo-dev/shared/validators';
import { createServiceClient } from '../../lib/supabase.js';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import {
  badRequest,
  forbidden,
  notFound,
  internalError,
} from '../../lib/errors.js';

// ============================================================
// Helper: verify org membership
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

// ============================================================
// Helper: verify channel membership
// ============================================================
async function verifyChannelMembership(channelId: string, userId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('channel_members')
    .select('*')
    .eq('channel_id', channelId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ============================================================
// channelMessages — mounted at /orgs/:orgId/channels/:channelId/messages
// ============================================================
export const channelMessages = new OpenAPIHono<{ Variables: AuthVariables }>();

channelMessages.use('/*', authMiddleware);

// GET / - list messages for a channel (cursor-based pagination)
const listMessagesRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Messages'],
  summary: 'List messages in a channel',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      channelId: z.string().uuid(),
    }),
    query: z.object({
      cursor: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(100).default(25),
    }),
  },
  responses: {
    200: {
      description: 'List of messages',
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
    404: { description: 'Not found' },
  },
});

channelMessages.openapi(listMessagesRoute, async (c) => {
  const user = c.get('user');
  const { orgId, channelId } = c.req.valid('param');
  const { cursor, limit } = c.req.valid('query');
  const supabase = createServiceClient();

  const orgMembership = await verifyOrgMembership(orgId, user.id);
  if (!orgMembership) return forbidden(c, 'You are not a member of this organization');

  const channelMembership = await verifyChannelMembership(channelId, user.id);
  if (!channelMembership) return forbidden(c, 'You are not a member of this channel');

  let query = supabase
    .from('messages')
    .select('*')
    .eq('channel_id', channelId)
    .is('parent_id', null)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data: messages, error } = await query;

  if (error) return internalError(c, error.message);

  const items = messages ?? [];
  let next_cursor: string | null = null;

  if (items.length > limit) {
    const last = items.pop();
    next_cursor = last?.created_at ?? null;
  }

  return c.json({ data: items, next_cursor });
});

// POST / - create a message in a channel
const createMessageRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Messages'],
  summary: 'Post a message to a channel',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      channelId: z.string().uuid(),
    }),
    body: {
      content: { 'application/json': { schema: createMessageSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      description: 'Message created',
      content: { 'application/json': { schema: z.object({ data: z.any() }) } },
    },
    400: { description: 'Bad request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
  },
});

channelMessages.openapi(createMessageRoute, async (c) => {
  const user = c.get('user');
  const { orgId, channelId } = c.req.valid('param');
  const body = c.req.valid('json');
  const supabase = createServiceClient();

  const orgMembership = await verifyOrgMembership(orgId, user.id);
  if (!orgMembership) return forbidden(c, 'You are not a member of this organization');

  const channelMembership = await verifyChannelMembership(channelId, user.id);
  if (!channelMembership) return forbidden(c, 'You are not a member of this channel');

  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      channel_id: channelId,
      author_id: user.id,
      content: body.content,
      parent_id: body.parent_id ?? null,
      attachments: body.attachments,
    })
    .select()
    .single();

  if (error) return badRequest(c, error.message);

  return c.json({ data: message }, 201);
});

// ============================================================
// orgMessages — mounted at /orgs/:orgId/messages
// ============================================================
export const orgMessages = new OpenAPIHono<{ Variables: AuthVariables }>();

orgMessages.use('/*', authMiddleware);

// PATCH /:messageId - edit a message (author only)
const editMessageRoute = createRoute({
  method: 'patch',
  path: '/:messageId',
  tags: ['Messages'],
  summary: 'Edit a message (author only)',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      messageId: z.string().uuid(),
    }),
    body: {
      content: { 'application/json': { schema: updateMessageSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Message updated',
      content: { 'application/json': { schema: z.object({ data: z.any() }) } },
    },
    400: { description: 'Bad request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
});

orgMessages.openapi(editMessageRoute, async (c) => {
  const user = c.get('user');
  const { orgId, messageId } = c.req.valid('param');
  const body = c.req.valid('json');
  const supabase = createServiceClient();

  const orgMembership = await verifyOrgMembership(orgId, user.id);
  if (!orgMembership) return forbidden(c, 'You are not a member of this organization');

  // Fetch the message to verify authorship
  const { data: existing, error: fetchErr } = await supabase
    .from('messages')
    .select('*')
    .eq('id', messageId)
    .single();

  if (fetchErr || !existing) return notFound(c, 'Message not found');
  if (existing.author_id !== user.id) {
    return forbidden(c, 'Only the author can edit this message');
  }

  const { data: message, error } = await supabase
    .from('messages')
    .update({ content: body.content, is_edited: true })
    .eq('id', messageId)
    .select()
    .single();

  if (error) return badRequest(c, error.message);

  return c.json({ data: message });
});

// DELETE /:messageId - soft delete a message
const deleteMessageRoute = createRoute({
  method: 'delete',
  path: '/:messageId',
  tags: ['Messages'],
  summary: 'Soft-delete a message (author or org admin/owner)',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      messageId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'Message deleted',
      content: { 'application/json': { schema: z.object({ data: z.object({ message: z.string() }) }) } },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
});

orgMessages.openapi(deleteMessageRoute, async (c) => {
  const user = c.get('user');
  const { orgId, messageId } = c.req.valid('param');
  const supabase = createServiceClient();

  const orgMembership = await verifyOrgMembership(orgId, user.id);
  if (!orgMembership) return forbidden(c, 'You are not a member of this organization');

  const { data: existing, error: fetchErr } = await supabase
    .from('messages')
    .select('*')
    .eq('id', messageId)
    .single();

  if (fetchErr || !existing) return notFound(c, 'Message not found');

  const isOrgPrivileged = ['owner', 'admin'].includes(orgMembership.role);
  if (existing.author_id !== user.id && !isOrgPrivileged) {
    return forbidden(c, 'Only the author or an org admin/owner can delete this message');
  }

  const { error } = await supabase
    .from('messages')
    .update({ is_deleted: true, content: '[deleted]' })
    .eq('id', messageId);

  if (error) return internalError(c, error.message);

  return c.json({ data: { message: 'Message deleted' } });
});

// POST /:messageId/reactions - add/toggle a reaction
const addReactionRoute = createRoute({
  method: 'post',
  path: '/:messageId/reactions',
  tags: ['Messages'],
  summary: 'Add or toggle a reaction on a message',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      messageId: z.string().uuid(),
    }),
    body: {
      content: { 'application/json': { schema: addReactionSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Reactions updated',
      content: { 'application/json': { schema: z.object({ data: z.any() }) } },
    },
    400: { description: 'Bad request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
});

orgMessages.openapi(addReactionRoute, async (c) => {
  const user = c.get('user');
  const { orgId, messageId } = c.req.valid('param');
  const { emoji } = c.req.valid('json');
  const supabase = createServiceClient();

  const orgMembership = await verifyOrgMembership(orgId, user.id);
  if (!orgMembership) return forbidden(c, 'You are not a member of this organization');

  const { data: existing, error: fetchErr } = await supabase
    .from('messages')
    .select('reactions')
    .eq('id', messageId)
    .single();

  if (fetchErr || !existing) return notFound(c, 'Message not found');

  // reactions is a JSONB object: { [emoji]: string[] (user IDs) }
  const reactions: Record<string, string[]> = (existing.reactions as Record<string, string[]>) ?? {};
  const emojiUsers: string[] = reactions[emoji] ?? [];

  if (emojiUsers.includes(user.id)) {
    // Toggle off: remove user
    reactions[emoji] = emojiUsers.filter((id) => id !== user.id);
    if (reactions[emoji].length === 0) {
      delete reactions[emoji];
    }
  } else {
    // Toggle on: add user
    reactions[emoji] = [...emojiUsers, user.id];
  }

  const { data: message, error } = await supabase
    .from('messages')
    .update({ reactions })
    .eq('id', messageId)
    .select()
    .single();

  if (error) return badRequest(c, error.message);

  return c.json({ data: message });
});

// GET /:messageId/thread - get thread replies
const getThreadRoute = createRoute({
  method: 'get',
  path: '/:messageId/thread',
  tags: ['Messages'],
  summary: 'Get thread replies for a message',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      messageId: z.string().uuid(),
    }),
    query: z.object({
      cursor: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(100).default(25),
    }),
  },
  responses: {
    200: {
      description: 'Thread replies',
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
    404: { description: 'Not found' },
  },
});

orgMessages.openapi(getThreadRoute, async (c) => {
  const user = c.get('user');
  const { orgId, messageId } = c.req.valid('param');
  const { cursor, limit } = c.req.valid('query');
  const supabase = createServiceClient();

  const orgMembership = await verifyOrgMembership(orgId, user.id);
  if (!orgMembership) return forbidden(c, 'You are not a member of this organization');

  // Verify the parent message exists
  const { data: parent, error: parentErr } = await supabase
    .from('messages')
    .select('id')
    .eq('id', messageId)
    .single();

  if (parentErr || !parent) return notFound(c, 'Message not found');

  let query = supabase
    .from('messages')
    .select('*')
    .eq('parent_id', messageId)
    .order('created_at', { ascending: true })
    .limit(limit + 1);

  if (cursor) {
    query = query.gt('created_at', cursor);
  }

  const { data: replies, error } = await query;

  if (error) return internalError(c, error.message);

  const items = replies ?? [];
  let next_cursor: string | null = null;

  if (items.length > limit) {
    const last = items.pop();
    next_cursor = last?.created_at ?? null;
  }

  return c.json({ data: items, next_cursor });
});
