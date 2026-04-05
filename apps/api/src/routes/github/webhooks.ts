import { Hono } from 'hono';
import { createServiceClient } from '../../lib/supabase.js';
import { verifyGitHubWebhook } from '../../middleware/github-webhook.js';
import { githubCache } from '../../services/github-cache.js';

// ============================================================
// Webhook Variables (set by middleware)
// ============================================================

type WebhookVariables = {
  webhookPayload: any;
  webhookEvent: string;
  webhookDelivery: string;
};

const app = new Hono<{ Variables: WebhookVariables }>();

// Verify signature on all requests
app.use('/*', verifyGitHubWebhook);

// ============================================================
// POST /webhooks — Receive GitHub webhook events
// ============================================================

app.post('/webhooks', async (c) => {
  const event = c.get('webhookEvent');
  const delivery = c.get('webhookDelivery');
  const payload = c.get('webhookPayload');

  // Find the github_repos record for this repository
  const githubRepoId = payload.repository?.id;
  if (!githubRepoId) {
    // Some events (installation) don't have a repository — handle separately
    if (event === 'installation') {
      return handleInstallationEvent(c, payload);
    }
    return c.json({ received: true, skipped: 'no_repository' });
  }

  const supabase = createServiceClient();

  // Look up our repo record
  const { data: repo } = await supabase
    .from('github_repos')
    .select('id, full_name, project_id')
    .eq('github_repo_id', githubRepoId)
    .maybeSingle();

  if (!repo) {
    // We don't track this repo — ignore
    return c.json({ received: true, skipped: 'untracked_repo' });
  }

  // Store the event for activity feed
  const eventPayload = buildEventPayload(event, payload);

  await supabase.from('github_events').insert({
    repo_id: repo.id,
    event_type: event,
    action: payload.action ?? null,
    payload: eventPayload,
    actor_login: payload.sender?.login ?? null,
    actor_avatar: payload.sender?.avatar_url ?? null,
    github_id: delivery,
  });

  // Invalidate cache for this repo
  githubCache.invalidate(repo.full_name);

  // Handle specific event types
  switch (event) {
    case 'push':
      await handlePush(supabase, repo, payload);
      break;
    case 'pull_request':
      await handlePullRequest(supabase, repo, payload);
      break;
    case 'check_suite':
      await handleCheckSuite(supabase, repo, payload);
      break;
  }

  return c.json({ received: true, event, action: payload.action ?? null });
});

// ============================================================
// Event handlers
// ============================================================

function buildEventPayload(event: string, payload: any): Record<string, unknown> {
  switch (event) {
    case 'push':
      return {
        ref: payload.ref,
        before: payload.before?.slice(0, 7),
        after: payload.after?.slice(0, 7),
        commits_count: payload.commits?.length ?? 0,
        head_commit_message: payload.head_commit?.message ?? null,
        head_commit_url: payload.head_commit?.url ?? null,
      };
    case 'pull_request':
      return {
        number: payload.pull_request?.number,
        title: payload.pull_request?.title,
        state: payload.pull_request?.merged ? 'merged' : payload.pull_request?.state,
        url: payload.pull_request?.html_url,
        head_ref: payload.pull_request?.head?.ref,
        base_ref: payload.pull_request?.base?.ref,
      };
    case 'check_suite':
      return {
        status: payload.check_suite?.status,
        conclusion: payload.check_suite?.conclusion,
        head_branch: payload.check_suite?.head_branch,
        head_sha: payload.check_suite?.head_sha?.slice(0, 7),
      };
    default:
      return { action: payload.action };
  }
}

async function handlePush(supabase: any, repo: any, payload: any) {
  // Create notifications for project members on push to default branch
  const ref = payload.ref ?? '';
  if (!ref.endsWith(`/${repo.default_branch ?? 'main'}`)) return;

  const commitCount = payload.commits?.length ?? 0;
  if (commitCount === 0) return;

  // Get project members to notify
  const { data: project } = await supabase
    .from('projects')
    .select('org_id, name')
    .eq('id', repo.project_id)
    .single();

  if (!project) return;

  const { data: members } = await supabase
    .from('org_members')
    .select('user_id')
    .eq('org_id', project.org_id);

  if (!members?.length) return;

  const actor = payload.sender?.login ?? 'Someone';
  const notifications = members.map((m: any) => ({
    user_id: m.user_id,
    org_id: project.org_id,
    type: 'github_push',
    title: `${actor} pushed ${commitCount} commit${commitCount > 1 ? 's' : ''} to ${project.name}`,
    body: payload.head_commit?.message ?? null,
    link: `/projects/${repo.project_id}/git`,
    metadata: { repo_full_name: repo.full_name, commits_count: commitCount },
  }));

  await supabase.from('notifications').insert(notifications);
}

async function handlePullRequest(supabase: any, repo: any, payload: any) {
  const pr = payload.pull_request;
  if (!pr) return;

  const action = payload.action;

  // Update existing PR links state
  if (action === 'closed' || action === 'reopened') {
    const newState = pr.merged ? 'merged' : pr.state;
    await supabase
      .from('github_pr_links')
      .update({ pr_state: newState, pr_title: pr.title })
      .eq('repo_id', repo.id)
      .eq('pr_number', pr.number);
  }

  // Auto-link: scan PR title and body for task references
  if (action === 'opened' || action === 'edited') {
    await autoLinkPr(supabase, repo, pr);
  }

  // Notifications for opened and merged
  if (action === 'opened' || (action === 'closed' && pr.merged)) {
    const { data: project } = await supabase
      .from('projects')
      .select('org_id, name')
      .eq('id', repo.project_id)
      .single();

    if (!project) return;

    const { data: members } = await supabase
      .from('org_members')
      .select('user_id')
      .eq('org_id', project.org_id);

    if (!members?.length) return;

    const actor = payload.sender?.login ?? 'Someone';
    const type = pr.merged ? 'github_pr_merged' : 'github_pr_opened';
    const verb = pr.merged ? 'merged' : 'opened';

    const notifications = members.map((m: any) => ({
      user_id: m.user_id,
      org_id: project.org_id,
      type,
      title: `${actor} ${verb} PR #${pr.number} in ${project.name}`,
      body: pr.title,
      link: `/projects/${repo.project_id}/git`,
      metadata: { pr_number: pr.number, pr_url: pr.html_url },
    }));

    await supabase.from('notifications').insert(notifications);
  }

  // Auto-close linked tasks on merge
  if (action === 'closed' && pr.merged) {
    await autoCloseLinkedItems(supabase, repo, pr.number);
  }
}

async function handleCheckSuite(supabase: any, repo: any, payload: any) {
  const suite = payload.check_suite;
  if (!suite || suite.conclusion !== 'failure') return;

  // Only notify on default branch failures
  if (suite.head_branch !== (repo.default_branch ?? 'main')) return;

  const { data: project } = await supabase
    .from('projects')
    .select('org_id, name, owner_id')
    .eq('id', repo.project_id)
    .single();

  if (!project) return;

  await supabase.from('notifications').insert({
    user_id: project.owner_id,
    org_id: project.org_id,
    type: 'github_ci_failed',
    title: `CI failed on ${project.name} (${suite.head_branch})`,
    body: `Check suite failed on commit ${suite.head_sha?.slice(0, 7)}`,
    link: `/projects/${repo.project_id}/git`,
    metadata: { head_sha: suite.head_sha, conclusion: suite.conclusion },
  });
}

// ============================================================
// Auto-linking helpers
// ============================================================

const LINK_PATTERNS = [
  /OLLO-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi,
  /(?:fixes|closes|resolves)\s+#?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi,
];

async function autoLinkPr(supabase: any, repo: any, pr: any) {
  const text = `${pr.title ?? ''} ${pr.body ?? ''}`;
  const itemIds = new Set<string>();

  for (const pattern of LINK_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      itemIds.add(match[1].toLowerCase());
    }
  }

  for (const itemId of itemIds) {
    // Check if this ID matches a task, bug, or ticket
    for (const [table, type] of [
      ['project_tasks', 'task'],
      ['project_bugs', 'bug'],
      ['discussions', 'ticket'],
    ] as const) {
      let query = supabase
        .from(table)
        .select('id')
        .eq('id', itemId);

      if (table === 'discussions') {
        query = query.eq('project_id', repo.project_id).eq('category', 'tickets');
      } else {
        query = query.eq('project_id', repo.project_id);
      }

      const { data } = await query.maybeSingle();

      if (data) {
        await supabase.from('github_pr_links').upsert(
          {
            repo_id: repo.id,
            pr_number: pr.number,
            pr_title: pr.title,
            pr_state: pr.merged ? 'merged' : pr.state,
            pr_url: pr.html_url,
            item_type: type,
            item_id: itemId,
            auto_linked: true,
          },
          { onConflict: 'repo_id,pr_number,item_type,item_id' }
        );
      }
    }
  }
}

async function autoCloseLinkedItems(supabase: any, repo: any, prNumber: number) {
  // Check org settings for auto-close
  const { data: project } = await supabase
    .from('projects')
    .select('org_id')
    .eq('id', repo.project_id)
    .single();

  if (!project) return;

  const { data: org } = await supabase
    .from('orgs')
    .select('github_settings')
    .eq('id', project.org_id)
    .single();

  if (!org?.github_settings?.auto_close_on_merge) return;

  // Find all linked items for this PR
  const { data: links } = await supabase
    .from('github_pr_links')
    .select('item_type, item_id')
    .eq('repo_id', repo.id)
    .eq('pr_number', prNumber);

  if (!links?.length) return;

  for (const link of links) {
    const table =
      link.item_type === 'task'
        ? 'project_tasks'
        : link.item_type === 'bug'
          ? 'project_bugs'
          : 'discussions';

    const doneStatus =
      link.item_type === 'task'
        ? 'done'
        : link.item_type === 'bug'
          ? 'fixed'
          : 'closed';

    await supabase.from(table).update({ status: doneStatus }).eq('id', link.item_id);
  }
}

// ============================================================
// Installation events (install/uninstall/suspend)
// ============================================================

async function handleInstallationEvent(c: any, payload: any) {
  const action = payload.action;
  const installationId = payload.installation?.id;

  if (!installationId) return c.json({ received: true, skipped: 'no_installation_id' });

  const supabase = createServiceClient();

  if (action === 'deleted') {
    // Uninstall — remove our record
    await supabase
      .from('github_installations')
      .delete()
      .eq('installation_id', installationId);
  } else if (action === 'suspend') {
    await supabase
      .from('github_installations')
      .update({ suspended_at: new Date().toISOString() })
      .eq('installation_id', installationId);
  } else if (action === 'unsuspend') {
    await supabase
      .from('github_installations')
      .update({ suspended_at: null })
      .eq('installation_id', installationId);
  }

  return c.json({ received: true, event: 'installation', action });
}

export default app;
