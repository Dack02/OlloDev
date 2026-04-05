import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { connectRepoSchema } from '@ollo-dev/shared/validators';
import { createServiceClient } from '../../lib/supabase.js';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import { badRequest, forbidden, internalError, notFound } from '../../lib/errors.js';
import {
  getInstallationForOrg,
  getInstallationOctokit,
} from '../../services/github.js';

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

function isAdminOrOwner(role: string): boolean {
  return ['owner', 'admin'].includes(role);
}

const app = new OpenAPIHono<{ Variables: AuthVariables }>();
app.use('/*', authMiddleware);

// ============================================================
// GET / — List available repos from GitHub (org-level)
// ============================================================
const listAvailableRoute = createRoute({
  method: 'get',
  path: '/available',
  tags: ['GitHub'],
  summary: 'List GitHub repos available via installation',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid() }),
    query: z.object({
      per_page: z.coerce.number().int().min(1).max(100).default(30),
      page: z.coerce.number().int().min(1).default(1),
    }),
  },
  responses: {
    200: { description: 'List of repos' },
    404: { description: 'No GitHub installation' },
  },
});

app.openapi(listAvailableRoute, async (c) => {
  const user = c.get('user');
  const { orgId } = c.req.valid('param');
  const { per_page, page } = c.req.valid('query');

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  const installation = await getInstallationForOrg(orgId);
  if (!installation) return notFound(c, 'No GitHub App installed for this organization');

  const octokit = await getInstallationOctokit(installation.installation_id);
  const { data } = await octokit.rest.apps.listReposAccessibleToInstallation({
    per_page,
    page,
  });

  const repos = data.repositories.map((r) => ({
    github_repo_id: r.id,
    full_name: r.full_name,
    name: r.name,
    private: r.private,
    default_branch: r.default_branch,
    description: r.description,
    html_url: r.html_url,
    language: r.language,
    updated_at: r.updated_at,
  }));

  return c.json({ data: repos, meta: { total: data.total_count } });
});

// ============================================================
// GET / — List repos connected to a project
// ============================================================
const listConnectedRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['GitHub'],
  summary: 'List repos connected to project',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      projectId: z.string().uuid(),
    }),
  },
  responses: {
    200: { description: 'Connected repos' },
  },
});

app.openapi(listConnectedRoute, async (c) => {
  const user = c.get('user');
  const { orgId, projectId } = c.req.valid('param');

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('github_repos')
    .select('*')
    .eq('project_id', projectId)
    .order('is_primary', { ascending: false });

  if (error) return internalError(c, error.message);

  return c.json({ data: data ?? [] });
});

// ============================================================
// POST / — Connect a repo to a project
// ============================================================
const connectRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['GitHub'],
  summary: 'Connect a GitHub repo to a project',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      projectId: z.string().uuid(),
    }),
    body: { content: { 'application/json': { schema: connectRepoSchema } } },
  },
  responses: {
    201: { description: 'Repo connected' },
    403: { description: 'Forbidden' },
    409: { description: 'Already connected' },
  },
});

app.openapi(connectRoute, async (c) => {
  const user = c.get('user');
  const { orgId, projectId } = c.req.valid('param');
  const body = c.req.valid('json');

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership || !isAdminOrOwner(membership.role)) {
    return forbidden(c, 'Only admins and owners can connect repos');
  }

  const installation = await getInstallationForOrg(orgId);
  if (!installation) return notFound(c, 'No GitHub App installed for this organization');

  const supabase = createServiceClient();

  // Check if any repo already connected to this project (set is_primary accordingly)
  const { data: existing } = await supabase
    .from('github_repos')
    .select('id')
    .eq('project_id', projectId);

  const { data, error } = await supabase
    .from('github_repos')
    .insert({
      project_id: projectId,
      installation_id: installation.id,
      github_repo_id: body.github_repo_id,
      full_name: body.full_name,
      default_branch: body.default_branch,
      is_primary: !existing || existing.length === 0,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') return c.json({ error: { code: 'CONFLICT', message: 'Repo already connected to this project' } }, 409);
    return internalError(c, error.message);
  }

  // Also update the project's repository_url for backward compat
  await supabase
    .from('projects')
    .update({ repository_url: `https://github.com/${body.full_name}` })
    .eq('id', projectId);

  return c.json({ data }, 201);
});

// ============================================================
// DELETE /:repoId — Disconnect a repo
// ============================================================
const disconnectRoute = createRoute({
  method: 'delete',
  path: '/:repoId',
  tags: ['GitHub'],
  summary: 'Disconnect a repo from a project',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      projectId: z.string().uuid(),
      repoId: z.string().uuid(),
    }),
  },
  responses: {
    200: { description: 'Disconnected' },
    403: { description: 'Forbidden' },
  },
});

app.openapi(disconnectRoute, async (c) => {
  const user = c.get('user');
  const { orgId, repoId } = c.req.valid('param');

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership || !isAdminOrOwner(membership.role)) {
    return forbidden(c, 'Only admins and owners can disconnect repos');
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from('github_repos')
    .delete()
    .eq('id', repoId);

  if (error) return internalError(c, error.message);

  return c.json({ data: { disconnected: true } });
});

export default app;
