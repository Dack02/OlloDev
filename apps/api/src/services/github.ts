import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';
import { createServiceClient } from '../lib/supabase.js';

// ============================================================
// Config (read once at startup)
// ============================================================

const appId = process.env.GITHUB_APP_ID ?? '';
const privateKeyB64 = process.env.GITHUB_APP_PRIVATE_KEY ?? '';
const clientId = process.env.GITHUB_CLIENT_ID ?? '';
const clientSecret = process.env.GITHUB_CLIENT_SECRET ?? '';
const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET ?? '';

function getPrivateKey(): string {
  if (!privateKeyB64) return '';
  // Support both base64-encoded and raw PEM
  if (privateKeyB64.startsWith('-----BEGIN')) return privateKeyB64;
  return Buffer.from(privateKeyB64, 'base64').toString('utf-8');
}

export function isGitHubConfigured(): boolean {
  return Boolean(appId && privateKeyB64 && clientId);
}

export function getWebhookSecret(): string {
  return webhookSecret;
}

export function getClientId(): string {
  return clientId;
}

// ============================================================
// In-memory installation token cache
// ============================================================

interface TokenEntry {
  token: string;
  expiresAt: number;
}

const tokenCache = new Map<number, TokenEntry>();

// ============================================================
// Octokit factory — App-level (for listing installations, etc.)
// ============================================================

export function getAppOctokit(): Octokit {
  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId,
      privateKey: getPrivateKey(),
      clientId,
      clientSecret,
    },
  });
}

// ============================================================
// Octokit factory — Installation-level (for repo operations)
// ============================================================

export async function getInstallationOctokit(installationId: number): Promise<Octokit> {
  // Check token cache
  const cached = tokenCache.get(installationId);
  if (cached && Date.now() < cached.expiresAt - 60_000) {
    return new Octokit({ auth: cached.token });
  }

  // Generate a fresh installation access token
  const appOctokit = getAppOctokit();
  const { data } = await appOctokit.rest.apps.createInstallationAccessToken({
    installation_id: installationId,
  });

  tokenCache.set(installationId, {
    token: data.token,
    expiresAt: new Date(data.expires_at).getTime(),
  });

  return new Octokit({ auth: data.token });
}

// ============================================================
// DB helpers
// ============================================================

export async function getInstallationForOrg(orgId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('github_installations')
    .select('*')
    .eq('org_id', orgId)
    .is('suspended_at', null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getRepoForProject(projectId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('github_repos')
    .select('*, github_installations!inner(*)')
    .eq('project_id', projectId)
    .eq('is_primary', true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Get an Octokit instance ready to call the GitHub API for a project's
 * primary connected repo. Returns null if no repo is connected.
 */
export async function getOctokitForProject(projectId: string): Promise<{ octokit: Octokit; repo: any } | null> {
  const repo = await getRepoForProject(projectId);
  if (!repo) return null;

  const octokit = await getInstallationOctokit(
    repo.github_installations.installation_id
  );

  return { octokit, repo };
}

// ============================================================
// GitHub App installation URL
// ============================================================

export function getInstallUrl(state: string): string {
  return `https://github.com/apps/ollodevapp/installations/new?state=${encodeURIComponent(state)}`;
}
