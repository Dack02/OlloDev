import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import {
  createOrgSchema,
  updateOrgSchema,
  inviteMemberSchema,
  updateMemberSchema,
} from '@ollo-dev/shared/validators';
import { createServiceClient, createUserClient } from '../../lib/supabase.js';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import {
  badRequest,
  forbidden,
  notFound,
  conflict,
  internalError,
} from '../../lib/errors.js';
import { sendEmailAsync, getUserDisplayName } from '../../services/email.js';
import { renderMemberInvite } from '../../emails/member-invite.js';

const app = new OpenAPIHono<{ Variables: AuthVariables }>();

// Apply auth to all routes
app.use('/*', authMiddleware);

// ============================================================
// GET / - list user's orgs
// ============================================================
const listOrgsRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Organizations'],
  summary: "List the current user's organizations",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'List of orgs',
      content: { 'application/json': { schema: z.object({ data: z.array(z.any()) }) } },
    },
    401: { description: 'Unauthorized' },
  },
});

app.openapi(listOrgsRoute, async (c) => {
  const user = c.get('user');
  const supabase = createServiceClient();

  const { data: memberships, error: memErr } = await supabase
    .from('org_members')
    .select('org_id, role, joined_at')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: true });

  if (memErr) return internalError(c, memErr.message);
  if (!memberships || memberships.length === 0) return c.json({ data: [] });

  const orgIds = memberships.map((m) => m.org_id);

  const { data: orgs, error: orgErr } = await supabase
    .from('orgs')
    .select('*')
    .in('id', orgIds);

  if (orgErr) return internalError(c, orgErr.message);

  // Merge role info onto each org
  const membershipMap = Object.fromEntries(memberships.map((m) => [m.org_id, m]));
  const result = (orgs ?? [])
    .map((org) => ({
      ...org,
      membership: membershipMap[org.id],
    }))
    .sort((a, b) => {
      const aJoinedAt = a.membership?.joined_at ?? '';
      const bJoinedAt = b.membership?.joined_at ?? '';
      if (aJoinedAt !== bJoinedAt) return aJoinedAt.localeCompare(bJoinedAt);
      return a.name.localeCompare(b.name);
    });

  return c.json({ data: result });
});

// ============================================================
// POST / - create org
// ============================================================
const createOrgRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Organizations'],
  summary: 'Create a new organization',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: { 'application/json': { schema: createOrgSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      description: 'Organization created',
      content: { 'application/json': { schema: z.object({ data: z.any() }) } },
    },
    400: { description: 'Bad request' },
    401: { description: 'Unauthorized' },
    409: { description: 'Slug already taken' },
  },
});

app.openapi(createOrgRoute, async (c) => {
  const user = c.get('user');
  const body = c.req.valid('json');
  const supabase = createServiceClient();

  // Check slug uniqueness
  const { data: existing } = await supabase
    .from('orgs')
    .select('id')
    .eq('slug', body.slug)
    .maybeSingle();

  if (existing) return conflict(c, 'An organization with that slug already exists');

  const { data: org, error: orgErr } = await supabase
    .from('orgs')
    .insert({ name: body.name, slug: body.slug })
    .select()
    .single();

  if (orgErr) return badRequest(c, orgErr.message);

  // Add creator as owner
  const { error: memberErr } = await supabase.from('org_members').insert({
    org_id: org.id,
    user_id: user.id,
    role: 'owner',
  });

  if (memberErr) {
    // Roll back org creation on failure
    await supabase.from('orgs').delete().eq('id', org.id);
    return internalError(c, memberErr.message);
  }

  return c.json({ data: org }, 201);
});

// ============================================================
// Helper: verify membership (optionally require admin/owner)
// ============================================================
/**
 * Rewrite a Supabase-generated action link so it points to the real Supabase
 * project URL (not localhost) and redirects back to the real web app URL.
 *
 * Supabase generates links like:
 *   http://localhost:3000/auth/v1/verify?token=...&type=invite&redirect_to=http://localhost:3000
 *
 * We rewrite to:
 *   https://<project>.supabase.co/auth/v1/verify?token=...&type=invite&redirect_to=https://dev.ollosoft.io/auth/callback
 */
function rewriteActionLink(actionLink: string, webUrl: string): string {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    if (!supabaseUrl) return actionLink;

    const parsed = new URL(actionLink);
    const supabase = new URL(supabaseUrl);

    // Point the verify endpoint at the real Supabase project
    parsed.protocol = supabase.protocol;
    parsed.host = supabase.host;

    // Fix the redirect_to param to point to the real web app
    if (parsed.searchParams.has('redirect_to')) {
      parsed.searchParams.set('redirect_to', `${webUrl}/auth/callback`);
    }

    return parsed.toString();
  } catch {
    return actionLink;
  }
}

async function getMembership(orgId: string, userId: string) {
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
// GET /:orgId - get single org
// ============================================================
const getOrgRoute = createRoute({
  method: 'get',
  path: '/:orgId',
  tags: ['Organizations'],
  summary: 'Get a single organization',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid() }),
  },
  responses: {
    200: {
      description: 'Organization details',
      content: { 'application/json': { schema: z.object({ data: z.any() }) } },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
});

app.openapi(getOrgRoute, async (c) => {
  const user = c.get('user');
  const { orgId } = c.req.valid('param');
  const supabase = createServiceClient();

  const membership = await getMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  const { data: org, error } = await supabase
    .from('orgs')
    .select('*')
    .eq('id', orgId)
    .single();

  if (error || !org) return notFound(c, 'Organization not found');

  return c.json({ data: { ...org, membership } });
});

// ============================================================
// PATCH /:orgId - update org (admin/owner only)
// ============================================================
const updateOrgRoute = createRoute({
  method: 'patch',
  path: '/:orgId',
  tags: ['Organizations'],
  summary: 'Update an organization (admin/owner only)',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid() }),
    body: {
      content: { 'application/json': { schema: updateOrgSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Organization updated',
      content: { 'application/json': { schema: z.object({ data: z.any() }) } },
    },
    400: { description: 'Bad request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
});

app.openapi(updateOrgRoute, async (c) => {
  const user = c.get('user');
  const { orgId } = c.req.valid('param');
  const body = c.req.valid('json');
  const supabase = createServiceClient();

  const membership = await getMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');
  if (!['owner', 'admin'].includes(membership.role)) {
    return forbidden(c, 'Only admins and owners can update the organization');
  }

  const { data: org, error } = await supabase
    .from('orgs')
    .update(body)
    .eq('id', orgId)
    .select()
    .single();

  if (error) return badRequest(c, error.message);
  if (!org) return notFound(c, 'Organization not found');

  return c.json({ data: org });
});

// ============================================================
// GET /:orgId/members - list members
// ============================================================
const listMembersRoute = createRoute({
  method: 'get',
  path: '/:orgId/members',
  tags: ['Organizations'],
  summary: 'List members of an organization',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid() }),
  },
  responses: {
    200: {
      description: 'List of members',
      content: { 'application/json': { schema: z.object({ data: z.array(z.any()) }) } },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
  },
});

app.openapi(listMembersRoute, async (c) => {
  const user = c.get('user');
  const { orgId } = c.req.valid('param');
  const supabase = createServiceClient();

  const membership = await getMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  const { data: members, error } = await supabase
    .from('org_members')
    .select('*')
    .eq('org_id', orgId);

  if (error) return internalError(c, error.message);

  // Fetch profiles for all member user_ids
  const userIds = (members ?? []).map((m) => m.user_id);
  const { data: profiles } = userIds.length > 0
    ? await supabase.from('profiles').select('*').in('id', userIds)
    : { data: [] };

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  // Fallback: fetch auth user metadata for members without profiles
  const missingIds = userIds.filter((id) => !profileMap.has(id));
  if (missingIds.length > 0) {
    const { data: usersData } = await supabase.auth.admin.listUsers();
    if (usersData?.users) {
      for (const u of usersData.users) {
        if (missingIds.includes(u.id)) {
          profileMap.set(u.id, {
            id: u.id,
            display_name: (u.user_metadata?.display_name as string) ?? null,
            email: u.email ?? null,
            avatar_url: (u.user_metadata?.avatar_url as string) ?? null,
          });
        }
      }
    }
  }

  const enriched = (members ?? []).map((m) => ({
    ...m,
    profiles: profileMap.get(m.user_id) ?? null,
  }));

  return c.json({ data: enriched });
});

// ============================================================
// POST /:orgId/members/invite - invite member
// ============================================================
const inviteMemberRoute = createRoute({
  method: 'post',
  path: '/:orgId/members/invite',
  tags: ['Organizations'],
  summary: 'Invite a member to the organization (admin/owner only)',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid() }),
    body: {
      content: { 'application/json': { schema: inviteMemberSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Invitation sent',
      content: { 'application/json': { schema: z.object({ data: z.object({ message: z.string() }) }) } },
    },
    400: { description: 'Bad request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    409: { description: 'Already a member' },
  },
});

app.openapi(inviteMemberRoute, async (c) => {
  const user = c.get('user');
  const { orgId } = c.req.valid('param');
  const body = c.req.valid('json');
  const supabase = createServiceClient();

  const membership = await getMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');
  if (!['owner', 'admin'].includes(membership.role)) {
    return forbidden(c, 'Only admins and owners can invite members');
  }

  // Get org name for the email
  const { data: org } = await supabase
    .from('orgs')
    .select('name')
    .eq('id', orgId)
    .single();
  const orgName = org?.name ?? 'your organization';
  const inviterName = await getUserDisplayName(user.id);
  const webUrl = process.env.NEXT_PUBLIC_WEB_URL ?? 'https://dev.ollosoft.io';

  // Lookup user by email via admin API
  const { data: usersData, error: usersErr } = await supabase.auth.admin.listUsers();
  if (usersErr) return internalError(c, usersErr.message);

  const invitee = usersData.users.find((u) => u.email === body.email);

  if (invitee) {
    // Check if already a member
    const existingMembership = await getMembership(orgId, invitee.id);
    if (existingMembership) return conflict(c, 'User is already a member of this organization');

    // Add them directly
    const { error: addErr } = await supabase.from('org_members').insert({
      org_id: orgId,
      user_id: invitee.id,
      role: body.role,
    });
    if (addErr) return badRequest(c, addErr.message);

    // Send notification email via Resend
    sendEmailAsync(orgId, {
      to: body.email,
      subject: `You've been added to ${orgName}`,
      html: renderMemberInvite({
        orgName,
        inviterName,
        role: body.role,
        actionUrl: webUrl,
        isNewUser: false,
      }),
      tags: [{ name: 'type', value: 'member_added' }],
    });
  } else {
    // Generate an invite link without Supabase sending the email
    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type: 'invite',
      email: body.email,
      options: {
        data: { org_id: orgId, role: body.role },
        redirectTo: `${webUrl}/auth/callback?org_id=${orgId}`,
      },
    });
    if (linkErr) return badRequest(c, linkErr.message);

    // Add the new user to the target org immediately
    // (generateLink already created the user in auth.users, trigger added them to default org)
    const newUserId = linkData.user.id;
    const { data: defaultOrg } = await supabase
      .from('orgs')
      .select('id')
      .eq('slug', 'default')
      .single();

    if (!defaultOrg || defaultOrg.id !== orgId) {
      // Target org is different from default — insert membership
      await supabase.from('org_members').insert({
        org_id: orgId,
        user_id: newUserId,
        role: body.role,
      });
    } else if (body.role !== 'member') {
      // Target org IS the default org but role differs — update
      await supabase.from('org_members')
        .update({ role: body.role })
        .eq('org_id', orgId)
        .eq('user_id', newUserId);
    }

    const actionUrl = linkData?.properties?.action_link
        ? rewriteActionLink(linkData.properties.action_link, webUrl)
        : webUrl;

    // Send invite email via Resend
    sendEmailAsync(orgId, {
      to: body.email,
      subject: `You're invited to join ${orgName}`,
      html: renderMemberInvite({
        orgName,
        inviterName,
        role: body.role,
        actionUrl,
        isNewUser: true,
      }),
      tags: [{ name: 'type', value: 'member_invite' }],
    });
  }

  // Track the invite in org_invites (upsert in case of re-invite)
  await supabase.from('org_invites').upsert(
    {
      org_id: orgId,
      email: body.email,
      role: body.role,
      invited_by: user.id,
      status: 'accepted',
    },
    { onConflict: 'org_id,email' }
  );

  return c.json({ data: { message: `Invitation sent to ${body.email}` } });
});

// ============================================================
// PATCH /:orgId/members/:userId - update member role
// ============================================================
const updateMemberRoute = createRoute({
  method: 'patch',
  path: '/:orgId/members/:userId',
  tags: ['Organizations'],
  summary: "Update a member's role (admin/owner only)",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid(), userId: z.string().uuid() }),
    body: {
      content: { 'application/json': { schema: updateMemberSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Member updated',
      content: { 'application/json': { schema: z.object({ data: z.any() }) } },
    },
    400: { description: 'Bad request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Member not found' },
  },
});

app.openapi(updateMemberRoute, async (c) => {
  const user = c.get('user');
  const { orgId, userId } = c.req.valid('param');
  const body = c.req.valid('json');
  const supabase = createServiceClient();

  const actorMembership = await getMembership(orgId, user.id);
  if (!actorMembership) return forbidden(c, 'You are not a member of this organization');
  if (!['owner', 'admin'].includes(actorMembership.role)) {
    return forbidden(c, 'Only admins and owners can update member roles');
  }

  const { data: updated, error } = await supabase
    .from('org_members')
    .update({ role: body.role })
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) return badRequest(c, error.message);
  if (!updated) return notFound(c, 'Member not found');

  return c.json({ data: updated });
});

// ============================================================
// DELETE /:orgId/members/:userId - remove member
// ============================================================
const removeMemberRoute = createRoute({
  method: 'delete',
  path: '/:orgId/members/:userId',
  tags: ['Organizations'],
  summary: 'Remove a member from the organization (admin/owner only)',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid(), userId: z.string().uuid() }),
  },
  responses: {
    200: {
      description: 'Member removed',
      content: { 'application/json': { schema: z.object({ data: z.object({ message: z.string() }) }) } },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Member not found' },
  },
});

app.openapi(removeMemberRoute, async (c) => {
  const user = c.get('user');
  const { orgId, userId } = c.req.valid('param');
  const supabase = createServiceClient();

  const actorMembership = await getMembership(orgId, user.id);
  if (!actorMembership) return forbidden(c, 'You are not a member of this organization');
  if (!['owner', 'admin'].includes(actorMembership.role)) {
    return forbidden(c, 'Only admins and owners can remove members');
  }

  // Prevent removing the only owner
  if (userId === user.id && actorMembership.role === 'owner') {
    return forbidden(c, 'Owners cannot remove themselves from the organization');
  }

  const { error, count } = await supabase
    .from('org_members')
    .delete({ count: 'exact' })
    .eq('org_id', orgId)
    .eq('user_id', userId);

  if (error) return internalError(c, error.message);
  if (count === 0) return notFound(c, 'Member not found');

  return c.json({ data: { message: 'Member removed successfully' } });
});

// ============================================================
// POST /:orgId/members/:userId/resend-invite - resend invite to existing member
// ============================================================
const resendMemberInviteRoute = createRoute({
  method: 'post',
  path: '/:orgId/members/:userId/resend-invite',
  tags: ['Organizations'],
  summary: 'Resend invitation email to an existing member (admin/owner only)',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid(), userId: z.string().uuid() }),
  },
  responses: {
    200: {
      description: 'Invitation resent',
      content: { 'application/json': { schema: z.object({ data: z.object({ message: z.string() }) }) } },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Member not found' },
  },
});

app.openapi(resendMemberInviteRoute, async (c) => {
  const user = c.get('user');
  const { orgId, userId } = c.req.valid('param');
  const supabase = createServiceClient();

  const actorMembership = await getMembership(orgId, user.id);
  if (!actorMembership) return forbidden(c, 'You are not a member of this organization');
  if (!['owner', 'admin'].includes(actorMembership.role)) {
    return forbidden(c, 'Only admins and owners can resend invites');
  }

  // Get the target member
  const targetMembership = await getMembership(orgId, userId);
  if (!targetMembership) return notFound(c, 'Member not found');

  // Get member email
  const { data: targetUser } = await supabase.auth.admin.getUserById(userId);
  if (!targetUser?.user) return notFound(c, 'User not found');
  const email = targetUser.user.email;
  if (!email) return badRequest(c, 'User has no email address');

  // Get org name
  const { data: org } = await supabase
    .from('orgs')
    .select('name')
    .eq('id', orgId)
    .single();
  const orgName = org?.name ?? 'your organization';
  const inviterName = await getUserDisplayName(user.id);
  const webUrl = process.env.NEXT_PUBLIC_WEB_URL ?? 'https://dev.ollosoft.io';

  // Check if user has confirmed their email (new user who hasn't accepted yet)
  const isNewUser = !targetUser.user.email_confirmed_at;

  let actionUrl = webUrl;
  if (isNewUser) {
    // Generate a fresh invite link for unconfirmed users
    const { data: linkData } = await supabase.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        data: { org_id: orgId, role: targetMembership.role },
        redirectTo: `${webUrl}/auth/callback?org_id=${orgId}`,
      },
    });
    actionUrl = linkData?.properties?.action_link
        ? rewriteActionLink(linkData.properties.action_link, webUrl)
        : webUrl;
  }

  sendEmailAsync(orgId, {
    to: email,
    subject: isNewUser
      ? `You're invited to join ${orgName}`
      : `You've been added to ${orgName}`,
    html: renderMemberInvite({
      orgName,
      inviterName,
      role: targetMembership.role,
      actionUrl,
      isNewUser,
    }),
    tags: [{ name: 'type', value: 'member_invite_resend' }],
  });

  return c.json({ data: { message: `Invitation resent to ${email}` } });
});

// ============================================================
// GET /:orgId/invites - list pending invites
// ============================================================
const listInvitesRoute = createRoute({
  method: 'get',
  path: '/:orgId/invites',
  tags: ['Organizations'],
  summary: 'List pending invitations (admin/owner only)',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid() }),
  },
  responses: {
    200: {
      description: 'List of invites',
      content: { 'application/json': { schema: z.object({ data: z.array(z.any()) }) } },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
  },
});

app.openapi(listInvitesRoute, async (c) => {
  const user = c.get('user');
  const { orgId } = c.req.valid('param');
  const supabase = createServiceClient();

  const membership = await getMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');
  if (!['owner', 'admin'].includes(membership.role)) {
    return forbidden(c, 'Only admins and owners can view invites');
  }

  const { data: invites, error } = await supabase
    .from('org_invites')
    .select('*')
    .eq('org_id', orgId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) return internalError(c, error.message);

  return c.json({ data: invites ?? [] });
});

// ============================================================
// POST /:orgId/invites/:inviteId/resend - resend an invitation
// ============================================================
const resendInviteRoute = createRoute({
  method: 'post',
  path: '/:orgId/invites/:inviteId/resend',
  tags: ['Organizations'],
  summary: 'Resend a pending invitation email (admin/owner only)',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid(), inviteId: z.string().uuid() }),
  },
  responses: {
    200: {
      description: 'Invitation resent',
      content: { 'application/json': { schema: z.object({ data: z.object({ message: z.string() }) }) } },
    },
    400: { description: 'Bad request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Invite not found' },
  },
});

app.openapi(resendInviteRoute, async (c) => {
  const user = c.get('user');
  const { orgId, inviteId } = c.req.valid('param');
  const supabase = createServiceClient();

  const membership = await getMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');
  if (!['owner', 'admin'].includes(membership.role)) {
    return forbidden(c, 'Only admins and owners can resend invites');
  }

  // Get the invite record
  const { data: invite, error: inviteErr } = await supabase
    .from('org_invites')
    .select('*')
    .eq('id', inviteId)
    .eq('org_id', orgId)
    .eq('status', 'pending')
    .single();

  if (inviteErr || !invite) return notFound(c, 'Pending invite not found');

  // Get org name
  const { data: org } = await supabase
    .from('orgs')
    .select('name')
    .eq('id', orgId)
    .single();
  const orgName = org?.name ?? 'your organization';
  const inviterName = await getUserDisplayName(user.id);
  const webUrl = process.env.NEXT_PUBLIC_WEB_URL ?? 'https://dev.ollosoft.io';

  // Generate a fresh invite link
  const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
    type: 'invite',
    email: invite.email,
    options: {
      data: { org_id: orgId, role: invite.role },
      redirectTo: `${webUrl}/auth/callback?org_id=${orgId}`,
    },
  });
  if (linkErr) return badRequest(c, linkErr.message);

  const actionUrl = linkData?.properties?.action_link
        ? rewriteActionLink(linkData.properties.action_link, webUrl)
        : webUrl;

  // Send invite email via Resend
  sendEmailAsync(orgId, {
    to: invite.email,
    subject: `You're invited to join ${orgName}`,
    html: renderMemberInvite({
      orgName,
      inviterName,
      role: invite.role,
      actionUrl,
      isNewUser: true,
    }),
    tags: [{ name: 'type', value: 'member_invite_resend' }],
  });

  // Update the invite timestamp
  await supabase
    .from('org_invites')
    .update({ invited_by: user.id })
    .eq('id', inviteId);

  return c.json({ data: { message: `Invitation resent to ${invite.email}` } });
});

// ============================================================
// DELETE /:orgId/invites/:inviteId - cancel a pending invite
// ============================================================
const cancelInviteRoute = createRoute({
  method: 'delete',
  path: '/:orgId/invites/:inviteId',
  tags: ['Organizations'],
  summary: 'Cancel a pending invitation (admin/owner only)',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid(), inviteId: z.string().uuid() }),
  },
  responses: {
    200: {
      description: 'Invite cancelled',
      content: { 'application/json': { schema: z.object({ data: z.object({ message: z.string() }) }) } },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Invite not found' },
  },
});

app.openapi(cancelInviteRoute, async (c) => {
  const user = c.get('user');
  const { orgId, inviteId } = c.req.valid('param');
  const supabase = createServiceClient();

  const membership = await getMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');
  if (!['owner', 'admin'].includes(membership.role)) {
    return forbidden(c, 'Only admins and owners can cancel invites');
  }

  const { error, count } = await supabase
    .from('org_invites')
    .delete({ count: 'exact' })
    .eq('id', inviteId)
    .eq('org_id', orgId);

  if (error) return internalError(c, error.message);
  if (count === 0) return notFound(c, 'Invite not found');

  return c.json({ data: { message: 'Invite cancelled' } });
});

export default app;
