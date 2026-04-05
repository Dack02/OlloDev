import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import {
  createChannelSchema,
  updateChannelSchema,
} from '@ollo-dev/shared/validators';
import { createServiceClient } from '../../lib/supabase.js';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import {
  badRequest,
  forbidden,
  notFound,
  conflict,
  internalError,
} from '../../lib/errors.js';

const app = new OpenAPIHono<{ Variables: AuthVariables }>();

// Apply auth to all routes
app.use('/*', authMiddleware);

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
async function getChannelMembership(channelId: string, userId: string) {
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
// GET / - list channels for org
// ============================================================
const listChannelsRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Channels'],
  summary: 'List channels for an organization',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid() }),
  },
  responses: {
    200: {
      description: 'List of channels',
      content: { 'application/json': { schema: z.object({ data: z.array(z.any()) }) } },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
  },
});

app.openapi(listChannelsRoute, async (c) => {
  const user = c.get('user');
  const { orgId } = c.req.valid('param');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  const { data: channels, error } = await supabase
    .from('channels')
    .select('*')
    .eq('org_id', orgId)
    .eq('is_archived', false);

  if (error) return internalError(c, error.message);

  return c.json({ data: channels ?? [] });
});

// ============================================================
// POST / - create channel
// ============================================================
const createChannelRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Channels'],
  summary: 'Create a new channel',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid() }),
    body: {
      content: { 'application/json': { schema: createChannelSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      description: 'Channel created',
      content: { 'application/json': { schema: z.object({ data: z.any() }) } },
    },
    400: { description: 'Bad request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    409: { description: 'Channel slug already exists' },
  },
});

app.openapi(createChannelRoute, async (c) => {
  const user = c.get('user');
  const { orgId } = c.req.valid('param');
  const body = c.req.valid('json');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  // Check slug uniqueness within org
  const { data: existing } = await supabase
    .from('channels')
    .select('id')
    .eq('org_id', orgId)
    .eq('slug', body.slug)
    .maybeSingle();

  if (existing) return conflict(c, 'A channel with that slug already exists in this organization');

  const { data: channel, error: channelErr } = await supabase
    .from('channels')
    .insert({
      org_id: orgId,
      name: body.name,
      slug: body.slug,
      description: body.description ?? null,
      type: body.type,
      created_by: user.id,
    })
    .select()
    .single();

  if (channelErr) return badRequest(c, channelErr.message);

  // Add creator as channel admin
  const { error: memberErr } = await supabase.from('channel_members').insert({
    channel_id: channel.id,
    user_id: user.id,
    role: 'admin',
  });

  if (memberErr) {
    // Roll back channel creation
    await supabase.from('channels').delete().eq('id', channel.id);
    return internalError(c, memberErr.message);
  }

  return c.json({ data: channel }, 201);
});

// ============================================================
// GET /:channelId - get single channel
// ============================================================
const getChannelRoute = createRoute({
  method: 'get',
  path: '/:channelId',
  tags: ['Channels'],
  summary: 'Get a single channel',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid(), channelId: z.string().uuid() }),
  },
  responses: {
    200: {
      description: 'Channel details',
      content: { 'application/json': { schema: z.object({ data: z.any() }) } },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
});

app.openapi(getChannelRoute, async (c) => {
  const user = c.get('user');
  const { orgId, channelId } = c.req.valid('param');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  const { data: channel, error } = await supabase
    .from('channels')
    .select('*')
    .eq('id', channelId)
    .eq('org_id', orgId)
    .single();

  if (error || !channel) return notFound(c, 'Channel not found');

  return c.json({ data: channel });
});

// ============================================================
// PATCH /:channelId - update channel
// ============================================================
const updateChannelRoute = createRoute({
  method: 'patch',
  path: '/:channelId',
  tags: ['Channels'],
  summary: 'Update a channel (channel admin or org admin/owner)',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid(), channelId: z.string().uuid() }),
    body: {
      content: { 'application/json': { schema: updateChannelSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Channel updated',
      content: { 'application/json': { schema: z.object({ data: z.any() }) } },
    },
    400: { description: 'Bad request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
});

app.openapi(updateChannelRoute, async (c) => {
  const user = c.get('user');
  const { orgId, channelId } = c.req.valid('param');
  const body = c.req.valid('json');
  const supabase = createServiceClient();

  const orgMembership = await verifyOrgMembership(orgId, user.id);
  if (!orgMembership) return forbidden(c, 'You are not a member of this organization');

  // Must be org admin/owner or channel admin
  const isOrgPrivileged = ['owner', 'admin'].includes(orgMembership.role);
  if (!isOrgPrivileged) {
    const channelMembership = await getChannelMembership(channelId, user.id);
    if (!channelMembership || channelMembership.role !== 'admin') {
      return forbidden(c, 'Only channel admins or org admins/owners can update this channel');
    }
  }

  const { data: channel, error } = await supabase
    .from('channels')
    .update(body)
    .eq('id', channelId)
    .eq('org_id', orgId)
    .select()
    .single();

  if (error) return badRequest(c, error.message);
  if (!channel) return notFound(c, 'Channel not found');

  return c.json({ data: channel });
});

// ============================================================
// DELETE /:channelId - soft delete (archive) channel
// ============================================================
const deleteChannelRoute = createRoute({
  method: 'delete',
  path: '/:channelId',
  tags: ['Channels'],
  summary: 'Archive a channel (channel admin or org admin/owner)',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid(), channelId: z.string().uuid() }),
  },
  responses: {
    200: {
      description: 'Channel archived',
      content: { 'application/json': { schema: z.object({ data: z.object({ message: z.string() }) }) } },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
});

app.openapi(deleteChannelRoute, async (c) => {
  const user = c.get('user');
  const { orgId, channelId } = c.req.valid('param');
  const supabase = createServiceClient();

  const orgMembership = await verifyOrgMembership(orgId, user.id);
  if (!orgMembership) return forbidden(c, 'You are not a member of this organization');

  const isOrgPrivileged = ['owner', 'admin'].includes(orgMembership.role);
  if (!isOrgPrivileged) {
    const channelMembership = await getChannelMembership(channelId, user.id);
    if (!channelMembership || channelMembership.role !== 'admin') {
      return forbidden(c, 'Only channel admins or org admins/owners can archive this channel');
    }
  }

  const { data: channel, error } = await supabase
    .from('channels')
    .update({ is_archived: true })
    .eq('id', channelId)
    .eq('org_id', orgId)
    .select()
    .single();

  if (error) return internalError(c, error.message);
  if (!channel) return notFound(c, 'Channel not found');

  return c.json({ data: { message: 'Channel archived successfully' } });
});

// ============================================================
// POST /:channelId/join - join a public channel
// ============================================================
const joinChannelRoute = createRoute({
  method: 'post',
  path: '/:channelId/join',
  tags: ['Channels'],
  summary: 'Join a public channel',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid(), channelId: z.string().uuid() }),
  },
  responses: {
    200: {
      description: 'Joined channel',
      content: { 'application/json': { schema: z.object({ data: z.any() }) } },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
    409: { description: 'Already a member' },
  },
});

app.openapi(joinChannelRoute, async (c) => {
  const user = c.get('user');
  const { orgId, channelId } = c.req.valid('param');
  const supabase = createServiceClient();

  const orgMembership = await verifyOrgMembership(orgId, user.id);
  if (!orgMembership) return forbidden(c, 'You are not a member of this organization');

  const { data: channel, error: channelErr } = await supabase
    .from('channels')
    .select('*')
    .eq('id', channelId)
    .eq('org_id', orgId)
    .single();

  if (channelErr || !channel) return notFound(c, 'Channel not found');
  if (channel.is_archived) return forbidden(c, 'Cannot join an archived channel');
  if (channel.type === 'private') {
    return forbidden(c, 'Private channels require an invitation to join');
  }

  // Check if already a member
  const existingMembership = await getChannelMembership(channelId, user.id);
  if (existingMembership) return conflict(c, 'You are already a member of this channel');

  const { data: member, error: insertErr } = await supabase
    .from('channel_members')
    .insert({ channel_id: channelId, user_id: user.id, role: 'member' })
    .select()
    .single();

  if (insertErr) return internalError(c, insertErr.message);

  return c.json({ data: member });
});

// ============================================================
// POST /:channelId/leave - leave a channel
// ============================================================
const leaveChannelRoute = createRoute({
  method: 'post',
  path: '/:channelId/leave',
  tags: ['Channels'],
  summary: 'Leave a channel',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid(), channelId: z.string().uuid() }),
  },
  responses: {
    200: {
      description: 'Left channel',
      content: { 'application/json': { schema: z.object({ data: z.object({ message: z.string() }) }) } },
    },
    400: { description: 'Bad request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not a member' },
  },
});

app.openapi(leaveChannelRoute, async (c) => {
  const user = c.get('user');
  const { orgId, channelId } = c.req.valid('param');
  const supabase = createServiceClient();

  const orgMembership = await verifyOrgMembership(orgId, user.id);
  if (!orgMembership) return forbidden(c, 'You are not a member of this organization');

  const channelMembership = await getChannelMembership(channelId, user.id);
  if (!channelMembership) return notFound(c, 'You are not a member of this channel');

  // Prevent leaving if the user is the only admin
  if (channelMembership.role === 'admin') {
    const { data: admins, error: adminsErr } = await supabase
      .from('channel_members')
      .select('user_id')
      .eq('channel_id', channelId)
      .eq('role', 'admin');

    if (adminsErr) return internalError(c, adminsErr.message);

    if (admins && admins.length === 1) {
      return badRequest(
        c,
        'You are the only admin of this channel. Promote another member to admin before leaving.'
      );
    }
  }

  const { error } = await supabase
    .from('channel_members')
    .delete()
    .eq('channel_id', channelId)
    .eq('user_id', user.id);

  if (error) return internalError(c, error.message);

  return c.json({ data: { message: 'You have left the channel' } });
});

export default app;
