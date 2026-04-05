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
    .eq('user_id', user.id);

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
  const result = (orgs ?? []).map((org) => ({
    ...org,
    membership: membershipMap[org.id],
  }));

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
    .select('*, profiles(*)')
    .eq('org_id', orgId);

  if (error) return internalError(c, error.message);

  return c.json({ data: members ?? [] });
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
  } else {
    // Invite via Supabase - this sends an email
    const { error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(body.email, {
      data: { org_id: orgId, role: body.role },
    });
    if (inviteErr) return badRequest(c, inviteErr.message);
  }

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

export default app;
