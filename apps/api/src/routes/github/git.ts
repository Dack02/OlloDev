import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import { createServiceClient } from '../../lib/supabase.js';
import { forbidden, notFound, internalError } from '../../lib/errors.js';
import { getOctokitForProject } from '../../services/github.js';
import { githubCache } from '../../services/github-cache.js';

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

function splitFullName(fullName: string): { owner: string; repo: string } {
  const [owner, repo] = fullName.split('/');
  return { owner, repo };
}

const app = new OpenAPIHono<{ Variables: AuthVariables }>();
app.use('/*', authMiddleware);

// ============================================================
// GET /commits — Recent commits
// ============================================================
const commitsRoute = createRoute({
  method: 'get',
  path: '/commits',
  tags: ['GitHub'],
  summary: 'Recent commits for connected repo',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      projectId: z.string().uuid(),
    }),
    query: z.object({
      branch: z.string().max(200).optional(),
      per_page: z.coerce.number().int().min(1).max(100).default(30),
    }),
  },
  responses: {
    200: { description: 'Commits list' },
    404: { description: 'No repo connected' },
  },
});

app.openapi(commitsRoute, async (c) => {
  const user = c.get('user');
  const { orgId, projectId } = c.req.valid('param');
  const { branch, per_page } = c.req.valid('query');

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  const result = await getOctokitForProject(projectId);
  if (!result) return notFound(c, 'No GitHub repo connected to this project');

  const { octokit, repo } = result;
  const { owner, repo: repoName } = splitFullName(repo.full_name);
  const sha = branch || repo.default_branch;
  const cacheKey = `commits:${repo.full_name}:${sha}:${per_page}`;

  const cached = githubCache.get<unknown[]>(cacheKey);
  if (cached) return c.json({ data: cached, meta: { cached: true } });

  try {
    const { data: commits } = await octokit.rest.repos.listCommits({
      owner,
      repo: repoName,
      sha,
      per_page,
    });

    const mapped = commits.map((cm) => ({
      sha: cm.sha,
      message: cm.commit.message,
      author_login: cm.author?.login ?? cm.commit.author?.name ?? 'unknown',
      author_avatar: cm.author?.avatar_url ?? null,
      date: cm.commit.author?.date ?? cm.commit.committer?.date ?? null,
      url: cm.html_url,
    }));

    githubCache.set(cacheKey, mapped);
    return c.json({ data: mapped });
  } catch (err: any) {
    if (err.status === 404) return notFound(c, 'Repository or branch not found on GitHub');
    return internalError(c, err.message ?? 'Failed to fetch commits');
  }
});

// ============================================================
// GET /pulls — Pull requests
// ============================================================
const pullsRoute = createRoute({
  method: 'get',
  path: '/pulls',
  tags: ['GitHub'],
  summary: 'Pull requests for connected repo',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      projectId: z.string().uuid(),
    }),
    query: z.object({
      state: z.enum(['open', 'closed', 'all']).default('open'),
      per_page: z.coerce.number().int().min(1).max(100).default(30),
    }),
  },
  responses: {
    200: { description: 'Pull requests list' },
    404: { description: 'No repo connected' },
  },
});

app.openapi(pullsRoute, async (c) => {
  const user = c.get('user');
  const { orgId, projectId } = c.req.valid('param');
  const { state, per_page } = c.req.valid('query');

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  const result = await getOctokitForProject(projectId);
  if (!result) return notFound(c, 'No GitHub repo connected to this project');

  const { octokit, repo } = result;
  const { owner, repo: repoName } = splitFullName(repo.full_name);
  const cacheKey = `pulls:${repo.full_name}:${state}:${per_page}`;

  const cached = githubCache.get<unknown[]>(cacheKey);
  if (cached) return c.json({ data: cached, meta: { cached: true } });

  try {
    const { data: pulls } = await octokit.rest.pulls.list({
      owner,
      repo: repoName,
      state,
      per_page,
      sort: 'updated',
      direction: 'desc',
    });

    const mapped = pulls.map((pr) => ({
      number: pr.number,
      title: pr.title,
      state: pr.merged_at ? 'merged' : pr.state,
      author_login: pr.user?.login ?? 'unknown',
      author_avatar: pr.user?.avatar_url ?? null,
      created_at: pr.created_at,
      updated_at: pr.updated_at,
      url: pr.html_url,
      draft: pr.draft ?? false,
      head_ref: pr.head.ref,
      base_ref: pr.base.ref,
      requested_reviewers: pr.requested_reviewers?.map((r: any) => r.login) ?? [],
    }));

    githubCache.set(cacheKey, mapped);
    return c.json({ data: mapped });
  } catch (err: any) {
    if (err.status === 404) return notFound(c, 'Repository not found on GitHub');
    return internalError(c, err.message ?? 'Failed to fetch pull requests');
  }
});

// ============================================================
// GET /branches — Branches
// ============================================================
const branchesRoute = createRoute({
  method: 'get',
  path: '/branches',
  tags: ['GitHub'],
  summary: 'Branches for connected repo',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      projectId: z.string().uuid(),
    }),
    query: z.object({
      per_page: z.coerce.number().int().min(1).max(100).default(30),
    }),
  },
  responses: {
    200: { description: 'Branches list' },
    404: { description: 'No repo connected' },
  },
});

app.openapi(branchesRoute, async (c) => {
  const user = c.get('user');
  const { orgId, projectId } = c.req.valid('param');
  const { per_page } = c.req.valid('query');

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  const result = await getOctokitForProject(projectId);
  if (!result) return notFound(c, 'No GitHub repo connected to this project');

  const { octokit, repo } = result;
  const { owner, repo: repoName } = splitFullName(repo.full_name);
  const cacheKey = `branches:${repo.full_name}:${per_page}`;

  const cached = githubCache.get<unknown[]>(cacheKey);
  if (cached) return c.json({ data: cached, meta: { cached: true } });

  try {
    const { data: branches } = await octokit.rest.repos.listBranches({
      owner,
      repo: repoName,
      per_page,
    });

    const mapped = branches.map((b) => ({
      name: b.name,
      protected: b.protected,
      last_commit_sha: b.commit.sha,
    }));

    githubCache.set(cacheKey, mapped);
    return c.json({ data: mapped });
  } catch (err: any) {
    if (err.status === 404) return notFound(c, 'Repository not found on GitHub');
    return internalError(c, err.message ?? 'Failed to fetch branches');
  }
});

// ============================================================
// GET /actions — Workflow runs
// ============================================================
const actionsRoute = createRoute({
  method: 'get',
  path: '/actions',
  tags: ['GitHub'],
  summary: 'Recent CI/Actions workflow runs',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      projectId: z.string().uuid(),
    }),
    query: z.object({
      per_page: z.coerce.number().int().min(1).max(30).default(10),
    }),
  },
  responses: {
    200: { description: 'Workflow runs' },
    404: { description: 'No repo connected' },
  },
});

app.openapi(actionsRoute, async (c) => {
  const user = c.get('user');
  const { orgId, projectId } = c.req.valid('param');
  const { per_page } = c.req.valid('query');

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  const result = await getOctokitForProject(projectId);
  if (!result) return notFound(c, 'No GitHub repo connected to this project');

  const { octokit, repo } = result;
  const { owner, repo: repoName } = splitFullName(repo.full_name);
  const cacheKey = `actions:${repo.full_name}:${per_page}`;

  const cached = githubCache.get<unknown[]>(cacheKey);
  if (cached) return c.json({ data: cached, meta: { cached: true } });

  try {
    const { data } = await octokit.rest.actions.listWorkflowRunsForRepo({
      owner,
      repo: repoName,
      per_page,
    });

    const mapped = data.workflow_runs.map((run) => ({
      id: run.id,
      name: run.name,
      status: run.status,
      conclusion: run.conclusion,
      head_branch: run.head_branch,
      head_sha: run.head_sha?.slice(0, 7),
      event: run.event,
      url: run.html_url,
      created_at: run.created_at,
      updated_at: run.updated_at,
      actor_login: run.actor?.login ?? null,
      actor_avatar: run.actor?.avatar_url ?? null,
    }));

    githubCache.set(cacheKey, mapped);
    return c.json({ data: mapped });
  } catch (err: any) {
    if (err.status === 404) return notFound(c, 'Repository not found on GitHub');
    return internalError(c, err.message ?? 'Failed to fetch workflow runs');
  }
});

export default app;
