import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { createPrLinkSchema } from '@ollo-dev/shared/validators';
import { createServiceClient } from '../../lib/supabase.js';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import { forbidden, internalError, notFound } from '../../lib/errors.js';

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

const app = new OpenAPIHono<{ Variables: AuthVariables }>();
app.use('/*', authMiddleware);

// ============================================================
// GET / — List PR links for a project
// ============================================================
const listRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['GitHub'],
  summary: 'List PR-task links for a project',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      projectId: z.string().uuid(),
    }),
  },
  responses: {
    200: { description: 'PR links' },
  },
});

app.openapi(listRoute, async (c) => {
  const user = c.get('user');
  const { orgId, projectId } = c.req.valid('param');

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  const supabase = createServiceClient();

  // Get repo IDs for this project
  const { data: repos } = await supabase
    .from('github_repos')
    .select('id')
    .eq('project_id', projectId);

  if (!repos?.length) return c.json({ data: [] });

  const repoIds = repos.map((r) => r.id);

  const { data, error } = await supabase
    .from('github_pr_links')
    .select('*')
    .in('repo_id', repoIds)
    .order('created_at', { ascending: false });

  if (error) return internalError(c, error.message);

  return c.json({ data: data ?? [] });
});

// ============================================================
// GET /item/:itemType/:itemId — Links for a specific dev item
// ============================================================
const itemLinksRoute = createRoute({
  method: 'get',
  path: '/item/:itemType/:itemId',
  tags: ['GitHub'],
  summary: 'List PR links for a specific dev item',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      projectId: z.string().uuid(),
      itemType: z.enum(['task', 'bug', 'ticket']),
      itemId: z.string().uuid(),
    }),
  },
  responses: {
    200: { description: 'PR links for item' },
  },
});

app.openapi(itemLinksRoute, async (c) => {
  const user = c.get('user');
  const { orgId, itemType, itemId } = c.req.valid('param');

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('github_pr_links')
    .select('*')
    .eq('item_type', itemType)
    .eq('item_id', itemId)
    .order('created_at', { ascending: false });

  if (error) return internalError(c, error.message);

  return c.json({ data: data ?? [] });
});

// ============================================================
// POST / — Manually link a PR to a dev item
// ============================================================
const createRoute_ = createRoute({
  method: 'post',
  path: '/',
  tags: ['GitHub'],
  summary: 'Manually link a PR to a dev item',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      projectId: z.string().uuid(),
    }),
    body: { content: { 'application/json': { schema: createPrLinkSchema } } },
  },
  responses: {
    201: { description: 'Link created' },
    404: { description: 'No repo connected' },
  },
});

app.openapi(createRoute_, async (c) => {
  const user = c.get('user');
  const { orgId, projectId } = c.req.valid('param');
  const body = c.req.valid('json');

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  const supabase = createServiceClient();

  // Get primary repo for this project
  const { data: repo } = await supabase
    .from('github_repos')
    .select('id')
    .eq('project_id', projectId)
    .eq('is_primary', true)
    .maybeSingle();

  if (!repo) return notFound(c, 'No repo connected to this project');

  const { data, error } = await supabase
    .from('github_pr_links')
    .insert({
      repo_id: repo.id,
      ...body,
      auto_linked: false,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') return c.json({ error: { code: 'CONFLICT', message: 'Link already exists' } }, 409);
    return internalError(c, error.message);
  }

  return c.json({ data }, 201);
});

// ============================================================
// DELETE /:linkId — Remove a PR link
// ============================================================
const deleteRoute = createRoute({
  method: 'delete',
  path: '/:linkId',
  tags: ['GitHub'],
  summary: 'Remove a PR link',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      projectId: z.string().uuid(),
      linkId: z.string().uuid(),
    }),
  },
  responses: {
    200: { description: 'Link removed' },
  },
});

app.openapi(deleteRoute, async (c) => {
  const user = c.get('user');
  const { orgId, linkId } = c.req.valid('param');

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  const supabase = createServiceClient();
  const { error } = await supabase
    .from('github_pr_links')
    .delete()
    .eq('id', linkId);

  if (error) return internalError(c, error.message);

  return c.json({ data: { deleted: true } });
});

export default app;
