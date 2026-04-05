import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { createServiceClient } from '../../lib/supabase.js';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import { badRequest, forbidden, notFound, internalError } from '../../lib/errors.js';

const app = new OpenAPIHono<{ Variables: AuthVariables }>();

app.use('/*', authMiddleware);

// Helper: verify org membership
async function verifyOrgMembership(orgId: string, userId: string) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('org_members')
    .select('*')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .maybeSingle();
  return data;
}

// ============================================================
// GET /dms — List DM channels for the current user in an org
// ============================================================
const listDmsRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['DMs'],
  summary: 'List DM channels for the current user',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid() }),
  },
  responses: {
    200: {
      description: 'List of DM channels',
      content: { 'application/json': { schema: z.object({ data: z.array(z.any()) }) } },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
  },
});

app.openapi(listDmsRoute, async (c) => {
  const user = c.get('user');
  const { orgId } = c.req.valid('param');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  // Get all DM channels where user is a member
  const { data: memberChannels, error: memErr } = await supabase
    .from('channel_members')
    .select('channel_id')
    .eq('user_id', user.id);

  if (memErr) return internalError(c, memErr.message);
  if (!memberChannels || memberChannels.length === 0) return c.json({ data: [] });

  const channelIds = memberChannels.map((m) => m.channel_id);

  const { data: channels, error: chanErr } = await supabase
    .from('channels')
    .select('*')
    .eq('org_id', orgId)
    .eq('type', 'dm')
    .in('id', channelIds)
    .order('updated_at', { ascending: false });

  if (chanErr) return internalError(c, chanErr.message);

  // For each DM, fetch the other participant's profile
  const result = await Promise.all(
    (channels ?? []).map(async (channel) => {
      const { data: members } = await supabase
        .from('channel_members')
        .select('user_id')
        .eq('channel_id', channel.id)
        .neq('user_id', user.id);

      const otherUserId = members?.[0]?.user_id;
      let otherUser = null;
      if (otherUserId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, status')
          .eq('id', otherUserId)
          .single();
        otherUser = profile;
      }

      return { ...channel, other_user: otherUser };
    })
  );

  return c.json({ data: result });
});

// ============================================================
// POST /dms — Create or get existing DM channel with a user
// ============================================================
const createDmRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['DMs'],
  summary: 'Create or find a DM channel with another user',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid() }),
    body: {
      content: {
        'application/json': {
          schema: z.object({ user_id: z.string().uuid() }),
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'DM channel (existing or new)',
      content: { 'application/json': { schema: z.object({ data: z.any() }) } },
    },
    400: { description: 'Bad request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
  },
});

app.openapi(createDmRoute, async (c) => {
  const user = c.get('user');
  const { orgId } = c.req.valid('param');
  const { user_id: targetUserId } = c.req.valid('json');
  const supabase = createServiceClient();

  if (targetUserId === user.id) {
    return badRequest(c, 'Cannot create a DM with yourself');
  }

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  const targetMembership = await verifyOrgMembership(orgId, targetUserId);
  if (!targetMembership) return badRequest(c, 'Target user is not a member of this organization');

  // Check for existing DM between these two users in this org
  const { data: myDmChannels } = await supabase
    .from('channel_members')
    .select('channel_id')
    .eq('user_id', user.id);

  const { data: theirDmChannels } = await supabase
    .from('channel_members')
    .select('channel_id')
    .eq('user_id', targetUserId);

  if (myDmChannels && theirDmChannels) {
    const myIds = new Set(myDmChannels.map((m) => m.channel_id));
    const sharedIds = theirDmChannels
      .map((m) => m.channel_id)
      .filter((id) => myIds.has(id));

    if (sharedIds.length > 0) {
      // Check if any of the shared channels is a DM in this org
      const { data: existingDm } = await supabase
        .from('channels')
        .select('*')
        .eq('org_id', orgId)
        .eq('type', 'dm')
        .in('id', sharedIds)
        .limit(1)
        .single();

      if (existingDm) {
        return c.json({ data: existingDm });
      }
    }
  }

  // Create new DM channel
  const slug = `dm-${[user.id, targetUserId].sort().join('-').slice(0, 40)}`;

  const { data: channel, error: chanErr } = await supabase
    .from('channels')
    .insert({
      org_id: orgId,
      name: 'DM',
      slug,
      type: 'dm',
      created_by: user.id,
    })
    .select()
    .single();

  if (chanErr) return badRequest(c, chanErr.message);

  // Add both users as members
  const { error: memErr } = await supabase.from('channel_members').insert([
    { channel_id: channel.id, user_id: user.id, role: 'member' },
    { channel_id: channel.id, user_id: targetUserId, role: 'member' },
  ]);

  if (memErr) {
    await supabase.from('channels').delete().eq('id', channel.id);
    return internalError(c, memErr.message);
  }

  return c.json({ data: channel });
});

export default app;
