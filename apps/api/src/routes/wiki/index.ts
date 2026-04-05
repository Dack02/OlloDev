import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import {
  createWikiSpaceSchema,
  createWikiPageSchema,
  updateWikiPageSchema,
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
// GET /spaces — List wiki spaces
// ============================================================
const listSpacesRoute = createRoute({
  method: 'get',
  path: '/spaces',
  tags: ['Wiki'],
  summary: 'List wiki spaces for an organization',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid() }),
  },
  responses: {
    200: {
      description: 'List of wiki spaces',
      content: {
        'application/json': {
          schema: z.object({ data: z.array(z.any()) }),
        },
      },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
  },
});

app.openapi(listSpacesRoute, async (c) => {
  const user = c.get('user');
  const { orgId } = c.req.valid('param');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  const { data: spaces, error } = await supabase
    .from('wiki_spaces')
    .select('*')
    .eq('org_id', orgId)
    .order('name', { ascending: true });

  if (error) return internalError(c, error.message);

  return c.json({ data: spaces ?? [] });
});

// ============================================================
// POST /spaces — Create wiki space
// ============================================================
const createSpaceRoute = createRoute({
  method: 'post',
  path: '/spaces',
  tags: ['Wiki'],
  summary: 'Create a new wiki space',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid() }),
    body: {
      content: { 'application/json': { schema: createWikiSpaceSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      description: 'Wiki space created',
      content: { 'application/json': { schema: z.object({ data: z.any() }) } },
    },
    400: { description: 'Bad request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
  },
});

app.openapi(createSpaceRoute, async (c) => {
  const user = c.get('user');
  const { orgId } = c.req.valid('param');
  const body = c.req.valid('json');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');
  if (!isAdminOrAbove(membership.role)) {
    return forbidden(c, 'Only admins and owners can create wiki spaces');
  }

  const { data: space, error } = await supabase
    .from('wiki_spaces')
    .insert({
      org_id: orgId,
      name: body.name,
      slug: body.slug,
      description: body.description ?? null,
      icon: body.icon ?? null,
      is_public: body.is_public,
    })
    .select()
    .single();

  if (error) return badRequest(c, error.message);

  return c.json({ data: space }, 201);
});

// ============================================================
// GET /spaces/:spaceId — Get single space
// ============================================================
const getSpaceRoute = createRoute({
  method: 'get',
  path: '/spaces/:spaceId',
  tags: ['Wiki'],
  summary: 'Get a single wiki space',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      spaceId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'Wiki space details',
      content: { 'application/json': { schema: z.object({ data: z.any() }) } },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
});

app.openapi(getSpaceRoute, async (c) => {
  const user = c.get('user');
  const { orgId, spaceId } = c.req.valid('param');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  const { data: space, error } = await supabase
    .from('wiki_spaces')
    .select('*')
    .eq('id', spaceId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (error) return internalError(c, error.message);
  if (!space) return notFound(c, 'Wiki space not found');

  return c.json({ data: space });
});

// ============================================================
// GET /spaces/:spaceId/pages — List pages in a space
// ============================================================
const listPagesRoute = createRoute({
  method: 'get',
  path: '/spaces/:spaceId/pages',
  tags: ['Wiki'],
  summary: 'List pages in a wiki space',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      spaceId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'List of wiki pages',
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

app.openapi(listPagesRoute, async (c) => {
  const user = c.get('user');
  const { orgId, spaceId } = c.req.valid('param');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  // Verify space belongs to org
  const { data: space, error: spaceErr } = await supabase
    .from('wiki_spaces')
    .select('id')
    .eq('id', spaceId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (spaceErr) return internalError(c, spaceErr.message);
  if (!space) return notFound(c, 'Wiki space not found');

  const { data: pages, error } = await supabase
    .from('wiki_pages')
    .select('id, title, slug, parent_id, is_published, sort_order, author_id, last_edited_by, created_at, updated_at')
    .eq('space_id', spaceId)
    .order('sort_order', { ascending: true });

  if (error) return internalError(c, error.message);

  return c.json({ data: pages ?? [] });
});

// ============================================================
// POST /spaces/:spaceId/pages — Create page
// ============================================================
const createPageRoute = createRoute({
  method: 'post',
  path: '/spaces/:spaceId/pages',
  tags: ['Wiki'],
  summary: 'Create a new wiki page',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      spaceId: z.string().uuid(),
    }),
    body: {
      content: { 'application/json': { schema: createWikiPageSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      description: 'Wiki page created',
      content: { 'application/json': { schema: z.object({ data: z.any() }) } },
    },
    400: { description: 'Bad request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
});

app.openapi(createPageRoute, async (c) => {
  const user = c.get('user');
  const { orgId, spaceId } = c.req.valid('param');
  const body = c.req.valid('json');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  // Verify space belongs to org
  const { data: space, error: spaceErr } = await supabase
    .from('wiki_spaces')
    .select('id')
    .eq('id', spaceId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (spaceErr) return internalError(c, spaceErr.message);
  if (!space) return notFound(c, 'Wiki space not found');

  const { data: page, error } = await supabase
    .from('wiki_pages')
    .insert({
      space_id: spaceId,
      author_id: user.id,
      last_edited_by: user.id,
      title: body.title,
      slug: body.slug,
      content: body.content,
      parent_id: body.parent_id ?? null,
      is_published: body.is_published,
      sort_order: body.sort_order,
    })
    .select()
    .single();

  if (error) return badRequest(c, error.message);

  return c.json({ data: page }, 201);
});

// ============================================================
// GET /pages/:pageId — Get single page with content
// ============================================================
const getPageRoute = createRoute({
  method: 'get',
  path: '/pages/:pageId',
  tags: ['Wiki'],
  summary: 'Get a single wiki page with content',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      pageId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'Wiki page details',
      content: { 'application/json': { schema: z.object({ data: z.any() }) } },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
});

app.openapi(getPageRoute, async (c) => {
  const user = c.get('user');
  const { orgId, pageId } = c.req.valid('param');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  // Join through wiki_spaces to verify org ownership
  const { data: page, error } = await supabase
    .from('wiki_pages')
    .select('*, wiki_spaces!inner(org_id)')
    .eq('id', pageId)
    .eq('wiki_spaces.org_id', orgId)
    .maybeSingle();

  if (error) return internalError(c, error.message);
  if (!page) return notFound(c, 'Wiki page not found');

  return c.json({ data: page });
});

// ============================================================
// PATCH /pages/:pageId — Update page
// ============================================================
const updatePageRoute = createRoute({
  method: 'patch',
  path: '/pages/:pageId',
  tags: ['Wiki'],
  summary: 'Update a wiki page',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      pageId: z.string().uuid(),
    }),
    body: {
      content: { 'application/json': { schema: updateWikiPageSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Wiki page updated',
      content: { 'application/json': { schema: z.object({ data: z.any() }) } },
    },
    400: { description: 'Bad request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
});

app.openapi(updatePageRoute, async (c) => {
  const user = c.get('user');
  const { orgId, pageId } = c.req.valid('param');
  const body = c.req.valid('json');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  // Fetch existing page (with org verification via join)
  const { data: existing, error: fetchErr } = await supabase
    .from('wiki_pages')
    .select('*, wiki_spaces!inner(org_id)')
    .eq('id', pageId)
    .eq('wiki_spaces.org_id', orgId)
    .maybeSingle();

  if (fetchErr) return internalError(c, fetchErr.message);
  if (!existing) return notFound(c, 'Wiki page not found');

  const contentChanged = body.content !== undefined && body.content !== existing.content;

  // If content changed, snapshot the previous version
  if (contentChanged) {
    // Get current max version for this page
    const { data: lastVersion } = await supabase
      .from('wiki_page_versions')
      .select('version')
      .eq('page_id', pageId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersion = (lastVersion?.version ?? 0) + 1;

    await supabase.from('wiki_page_versions').insert({
      page_id: pageId,
      content: existing.content,
      edited_by: user.id,
      change_note: body.change_note ?? null,
      version: nextVersion,
    });
  }

  const { change_note: _cn, ...updateFields } = body;
  const { data: page, error } = await supabase
    .from('wiki_pages')
    .update({ ...updateFields, last_edited_by: user.id })
    .eq('id', pageId)
    .select()
    .single();

  if (error) return badRequest(c, error.message);

  return c.json({ data: page });
});

// ============================================================
// DELETE /pages/:pageId — Delete page
// ============================================================
const deletePageRoute = createRoute({
  method: 'delete',
  path: '/pages/:pageId',
  tags: ['Wiki'],
  summary: 'Delete a wiki page',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      pageId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'Wiki page deleted',
      content: { 'application/json': { schema: z.object({ success: z.boolean() }) } },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
});

app.openapi(deletePageRoute, async (c) => {
  const user = c.get('user');
  const { orgId, pageId } = c.req.valid('param');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');
  if (!isAdminOrAbove(membership.role)) {
    return forbidden(c, 'Only admins and owners can delete wiki pages');
  }

  // Verify page belongs to an org space
  const { data: existing, error: fetchErr } = await supabase
    .from('wiki_pages')
    .select('id, wiki_spaces!inner(org_id)')
    .eq('id', pageId)
    .eq('wiki_spaces.org_id', orgId)
    .maybeSingle();

  if (fetchErr) return internalError(c, fetchErr.message);
  if (!existing) return notFound(c, 'Wiki page not found');

  const { error } = await supabase.from('wiki_pages').delete().eq('id', pageId);
  if (error) return internalError(c, error.message);

  return c.json({ success: true });
});

// ============================================================
// GET /pages/:pageId/versions — List version history
// ============================================================
const listVersionsRoute = createRoute({
  method: 'get',
  path: '/pages/:pageId/versions',
  tags: ['Wiki'],
  summary: 'List version history for a wiki page',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      pageId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'List of page versions',
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

app.openapi(listVersionsRoute, async (c) => {
  const user = c.get('user');
  const { orgId, pageId } = c.req.valid('param');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  // Verify page belongs to an org space
  const { data: existing, error: fetchErr } = await supabase
    .from('wiki_pages')
    .select('id, wiki_spaces!inner(org_id)')
    .eq('id', pageId)
    .eq('wiki_spaces.org_id', orgId)
    .maybeSingle();

  if (fetchErr) return internalError(c, fetchErr.message);
  if (!existing) return notFound(c, 'Wiki page not found');

  const { data: versions, error } = await supabase
    .from('wiki_page_versions')
    .select('id, version, edited_by, change_note, created_at')
    .eq('page_id', pageId)
    .order('version', { ascending: false });

  if (error) return internalError(c, error.message);

  return c.json({ data: versions ?? [] });
});

export default app;
