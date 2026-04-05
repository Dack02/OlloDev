import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { createServiceClient } from '../../lib/supabase.js';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import { badRequest, forbidden, internalError, notFound } from '../../lib/errors.js';
import {
  getInstallUrl,
  getAppOctokit,
  isGitHubConfigured,
  getClientId,
} from '../../services/github.js';
import crypto from 'node:crypto';

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

// ============================================================
// App — two sub-apps: one authed (org-scoped), one public (callback)
// ============================================================

// Authed routes (mounted at /api/v1/orgs/:orgId/github)
const authedApp = new OpenAPIHono<{ Variables: AuthVariables }>();
authedApp.use('/*', authMiddleware);

// ── GET /install — Return GitHub App installation URL ───────
const installRoute = createRoute({
  method: 'get',
  path: '/install',
  tags: ['GitHub'],
  summary: 'Get GitHub App installation URL',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid() }),
  },
  responses: {
    200: { description: 'Installation URL' },
    403: { description: 'Forbidden' },
  },
});

authedApp.openapi(installRoute, async (c) => {
  const user = c.get('user');
  const { orgId } = c.req.valid('param');

  if (!isGitHubConfigured()) {
    return badRequest(c, 'GitHub App is not configured on this server');
  }

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership || !isAdminOrOwner(membership.role)) {
    return forbidden(c, 'Only admins and owners can install the GitHub App');
  }

  // Create a state token to prevent CSRF and link back to the org
  const state = Buffer.from(
    JSON.stringify({ orgId, nonce: crypto.randomBytes(16).toString('hex') })
  ).toString('base64url');

  return c.json({ data: { url: getInstallUrl(state), state } });
});

// ── GET /installation — Current installation status ─────────
const getInstallationRoute = createRoute({
  method: 'get',
  path: '/installation',
  tags: ['GitHub'],
  summary: 'Get current GitHub installation for org',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid() }),
  },
  responses: {
    200: { description: 'Installation details or null' },
  },
});

authedApp.openapi(getInstallationRoute, async (c) => {
  const user = c.get('user');
  const { orgId } = c.req.valid('param');

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('github_installations')
    .select('*')
    .eq('org_id', orgId)
    .is('suspended_at', null)
    .maybeSingle();

  if (error) return internalError(c, error.message);

  return c.json({ data, meta: { is_configured: isGitHubConfigured() } });
});

// ── DELETE /installation — Disconnect GitHub ────────────────
const deleteInstallationRoute = createRoute({
  method: 'delete',
  path: '/installation',
  tags: ['GitHub'],
  summary: 'Disconnect GitHub App installation',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid() }),
  },
  responses: {
    200: { description: 'Disconnected' },
    403: { description: 'Forbidden' },
  },
});

authedApp.openapi(deleteInstallationRoute, async (c) => {
  const user = c.get('user');
  const { orgId } = c.req.valid('param');

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership || !isAdminOrOwner(membership.role)) {
    return forbidden(c, 'Only admins and owners can disconnect the GitHub App');
  }

  const supabase = createServiceClient();

  // Delete all linked repos first (cascade will handle events + links)
  await supabase
    .from('github_repos')
    .delete()
    .in(
      'installation_id',
      (
        await supabase
          .from('github_installations')
          .select('id')
          .eq('org_id', orgId)
      ).data?.map((r) => r.id) ?? []
    );

  const { error } = await supabase
    .from('github_installations')
    .delete()
    .eq('org_id', orgId);

  if (error) return internalError(c, error.message);

  return c.json({ data: { disconnected: true } });
});

// ============================================================
// Public callback route (mounted at /api/v1/github)
// ============================================================

const callbackApp = new OpenAPIHono();

const callbackRoute = createRoute({
  method: 'get',
  path: '/callback',
  tags: ['GitHub'],
  summary: 'GitHub App installation callback',
  request: {
    query: z.object({
      installation_id: z.coerce.number().int(),
      setup_action: z.string().optional(),
      state: z.string().optional(),
    }),
  },
  responses: {
    302: { description: 'Redirect to app' },
    400: { description: 'Bad request' },
  },
});

callbackApp.openapi(callbackRoute, async (c) => {
  const { installation_id, setup_action, state } = c.req.valid('query');

  // Parse the state to get orgId
  let orgId: string | null = null;
  if (state) {
    try {
      const parsed = JSON.parse(Buffer.from(state, 'base64url').toString());
      orgId = parsed.orgId ?? null;
    } catch {
      return badRequest(c, 'Invalid state parameter');
    }
  }

  if (!orgId) return badRequest(c, 'Missing orgId in state');

  if (setup_action === 'install' || !setup_action) {
    // Fetch installation details from GitHub
    const appOctokit = getAppOctokit();
    const { data: installation } = await appOctokit.rest.apps.getInstallation({
      installation_id,
    });

    const supabase = createServiceClient();

    // Upsert — handles reinstallation
    const { error } = await supabase.from('github_installations').upsert(
      {
        org_id: orgId,
        installation_id,
        account_login: (installation.account as any)?.login ?? (installation.account as any)?.name ?? 'unknown',
        account_type: (installation.account as any)?.type ?? 'Organization',
        permissions: installation.permissions ?? {},
        events: installation.events ?? [],
        suspended_at: null,
      },
      { onConflict: 'installation_id' }
    );

    if (error) {
      console.error('[GitHub] Failed to store installation', error);
      return badRequest(c, 'Failed to store installation');
    }
  }

  // Redirect back to the app's settings or project page
  const webUrl = process.env.NEXT_PUBLIC_API_URL?.replace(':8000', ':3000') ?? 'http://localhost:3000';
  return c.redirect(`${webUrl}/en/settings?github=connected`);
});

export { authedApp as githubInstallRoutes, callbackApp as githubCallbackRoutes };
