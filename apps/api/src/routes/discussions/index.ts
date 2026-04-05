import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import {
  createDiscussionSchema,
  updateDiscussionSchema,
  closeDiscussionSchema,
  bulkArchiveDiscussionsSchema,
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
      project_id: z.string().uuid().optional(),
      status: z.string().optional(),
      include_archived: z.coerce.boolean().default(false),
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
  const { category, tag, project_id, status, include_archived, cursor, limit } = c.req.valid('query');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  let query = supabase
    .from('discussions')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  // Status filtering: by default exclude archived
  if (status) {
    query = query.eq('status', status);
  } else if (!include_archived) {
    query = query.neq('status', 'archived');
  }

  if (category) query = query.eq('category', category);
  if (tag) query = query.contains('tags', [tag]);
  if (project_id) query = query.eq('project_id', project_id);
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

  // Verify project belongs to this org if provided
  if (body.project_id) {
    const { data: proj } = await supabase
      .from('projects')
      .select('id')
      .eq('id', body.project_id)
      .eq('org_id', orgId)
      .maybeSingle();
    if (!proj) return badRequest(c, 'Project not found in this organization');
  }

  const { data: discussion, error } = await supabase
    .from('discussions')
    .insert({
      org_id: orgId,
      author_id: user.id,
      title: body.title,
      body: body.body,
      category: body.category ?? null,
      tags: body.tags,
      project_id: body.project_id ?? null,
      assignee_id: body.assignee_id ?? null,
      priority: body.priority ?? null,
      requester_name: body.requester_name ?? null,
      requester_email: body.requester_email ?? null,
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

  // Verify project belongs to this org if changing project_id
  if (body.project_id) {
    const { data: proj } = await supabase
      .from('projects')
      .select('id')
      .eq('id', body.project_id)
      .eq('org_id', orgId)
      .maybeSingle();
    if (!proj) return badRequest(c, 'Project not found in this organization');
  }

  // Non-admins cannot pin, lock, or change status
  const updates: Record<string, unknown> = { ...body };
  if (!isAdmin) {
    delete updates.is_pinned;
    delete updates.is_locked;
    delete updates.status;
  }

  // Handle status transition metadata
  if (updates.status === 'closed') {
    updates.closed_at = new Date().toISOString();
    updates.closed_by = user.id;
  } else if (updates.status === 'open') {
    updates.closed_at = null;
    updates.closed_by = null;
    updates.close_reason = null;
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

// ============================================================
// POST /:discussionId/close — Close discussion
// ============================================================
const closeDiscussionRoute = createRoute({
  method: 'post',
  path: '/:discussionId/close',
  tags: ['Discussions'],
  summary: 'Close a discussion',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      discussionId: z.string().uuid(),
    }),
    body: {
      content: { 'application/json': { schema: closeDiscussionSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Discussion closed',
      content: { 'application/json': { schema: z.object({ data: z.any() }) } },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
});

app.openapi(closeDiscussionRoute, async (c) => {
  const user = c.get('user');
  const { orgId, discussionId } = c.req.valid('param');
  const body = c.req.valid('json');
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
    return forbidden(c, 'Only the author or an admin/owner can close this discussion');
  }

  const { data: discussion, error } = await supabase
    .from('discussions')
    .update({
      status: 'closed',
      closed_at: new Date().toISOString(),
      closed_by: user.id,
      close_reason: body.reason ?? null,
    })
    .eq('id', discussionId)
    .select()
    .single();

  if (error) return internalError(c, error.message);

  return c.json({ data: discussion });
});

// ============================================================
// POST /:discussionId/reopen — Reopen discussion
// ============================================================
const reopenDiscussionRoute = createRoute({
  method: 'post',
  path: '/:discussionId/reopen',
  tags: ['Discussions'],
  summary: 'Reopen a closed discussion',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      discussionId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'Discussion reopened',
      content: { 'application/json': { schema: z.object({ data: z.any() }) } },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
});

app.openapi(reopenDiscussionRoute, async (c) => {
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
    return forbidden(c, 'Only the author or an admin/owner can reopen this discussion');
  }

  const { data: discussion, error } = await supabase
    .from('discussions')
    .update({
      status: 'open',
      closed_at: null,
      closed_by: null,
      close_reason: null,
    })
    .eq('id', discussionId)
    .select()
    .single();

  if (error) return internalError(c, error.message);

  return c.json({ data: discussion });
});

// ============================================================
// POST /:discussionId/archive — Archive discussion (admin only)
// ============================================================
const archiveDiscussionRoute = createRoute({
  method: 'post',
  path: '/:discussionId/archive',
  tags: ['Discussions'],
  summary: 'Archive a discussion (admin only)',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      discussionId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'Discussion archived',
      content: { 'application/json': { schema: z.object({ data: z.any() }) } },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
});

app.openapi(archiveDiscussionRoute, async (c) => {
  const user = c.get('user');
  const { orgId, discussionId } = c.req.valid('param');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  if (!isAdminOrAbove(membership.role)) {
    return forbidden(c, 'Only admins can archive discussions');
  }

  const { data: existing, error: fetchErr } = await supabase
    .from('discussions')
    .select('id')
    .eq('id', discussionId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (fetchErr) return internalError(c, fetchErr.message);
  if (!existing) return notFound(c, 'Discussion not found');

  const { data: discussion, error } = await supabase
    .from('discussions')
    .update({ status: 'archived' })
    .eq('id', discussionId)
    .select()
    .single();

  if (error) return internalError(c, error.message);

  return c.json({ data: discussion });
});

// ============================================================
// POST /bulk-archive — Bulk archive discussions (admin only)
// ============================================================
const bulkArchiveRoute = createRoute({
  method: 'post',
  path: '/bulk-archive',
  tags: ['Discussions'],
  summary: 'Bulk archive discussions (admin only)',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid() }),
    body: {
      content: { 'application/json': { schema: bulkArchiveDiscussionsSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Discussions archived',
      content: { 'application/json': { schema: z.object({ archived_count: z.number() }) } },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
  },
});

app.openapi(bulkArchiveRoute, async (c) => {
  const user = c.get('user');
  const { orgId } = c.req.valid('param');
  const { discussion_ids } = c.req.valid('json');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  if (!isAdminOrAbove(membership.role)) {
    return forbidden(c, 'Only admins can bulk archive discussions');
  }

  const { data, error } = await supabase
    .from('discussions')
    .update({ status: 'archived' })
    .in('id', discussion_ids)
    .eq('org_id', orgId)
    .select('id');

  if (error) return internalError(c, error.message);

  return c.json({ archived_count: data?.length ?? 0 });
});

export default app;
