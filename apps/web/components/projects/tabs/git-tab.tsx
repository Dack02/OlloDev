"use client";

import { useEffect, useState, useCallback } from "react";
import { useProjectStore } from "@/stores/project-store";
import { useAuth } from "@/lib/auth-context";
import { GitHubConnectCard } from "@/components/projects/github/github-connect-card";
import { CommitList } from "@/components/projects/git/commit-list";
import { PullRequestList } from "@/components/projects/git/pull-request-list";
import { BranchList } from "@/components/projects/git/branch-list";
import { ActionsStatus } from "@/components/projects/git/actions-status";
import {
  GitCommitIcon,
  GitPullRequestIcon,
  GitBranchIcon,
  PlayIcon,
  RefreshCwIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FolderGit2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface GitTabProps {
  projectId: string;
}

type Section = "commits" | "pulls" | "branches" | "actions";

export function GitTab({ projectId }: GitTabProps) {
  const { org, accessToken } = useAuth();
  const {
    githubRepos,
    commits,
    pullRequests,
    branches,
    actionRuns,
    gitLoading,
    gitError,
    gitLastFetched,
    setGitHubRepos,
    setCommits,
    setPullRequests,
    setBranches,
    setActionRuns,
    setGitLoading,
    setGitError,
    setGitLastFetched,
  } = useProjectStore();

  const [hasInstallation, setHasInstallation] = useState(false);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [installationChecked, setInstallationChecked] = useState(false);
  const [expanded, setExpanded] = useState<Record<Section, boolean>>({
    commits: true,
    pulls: true,
    branches: false,
    actions: false,
  });

  const orgId = org?.id;
  const projectRepos = githubRepos.filter((r) => r.project_id === projectId);
  const primaryRepo = projectRepos.find((r) => r.is_primary) ?? projectRepos[0];

  // Check installation status, auto-sync if configured but not found
  useEffect(() => {
    if (!orgId || !accessToken) return;
    const headers = { Authorization: `Bearer ${accessToken}` };
    const base = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/github`;

    fetch(`${base}/installation`, { headers })
      .then((r) => r.json())
      .then(async (json) => {
        setIsConfigured(json.meta?.is_configured ?? null);
        if (json.data) {
          setHasInstallation(true);
        } else if (json.meta?.is_configured) {
          // GitHub is configured but no installation found — try to sync
          const syncRes = await fetch(`${base}/installation/sync`, {
            method: "POST",
            headers,
          });
          const syncJson = await syncRes.json();
          setHasInstallation(!!syncJson.data);
        }
      })
      .catch(() => {})
      .finally(() => setInstallationChecked(true));
  }, [orgId, accessToken]);

  // Fetch connected repos
  useEffect(() => {
    if (!orgId || !accessToken) return;
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/projects/${projectId}/github/repos`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
      .then((r) => r.json())
      .then((json) => setGitHubRepos(json.data ?? []))
      .catch(() => {});
  }, [orgId, accessToken, projectId, setGitHubRepos]);

  // Fetch git data
  const fetchGitData = useCallback(async () => {
    if (!orgId || !accessToken || !primaryRepo) return;
    setGitLoading(true);
    setGitError(null);

    const base = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/projects/${projectId}/github`;
    const headers = { Authorization: `Bearer ${accessToken}` };

    try {
      const [commitsRes, pullsRes, branchesRes, actionsRes] = await Promise.all([
        fetch(`${base}/commits?per_page=30`, { headers }),
        fetch(`${base}/pulls?state=all&per_page=20`, { headers }),
        fetch(`${base}/branches?per_page=30`, { headers }),
        fetch(`${base}/actions?per_page=10`, { headers }),
      ]);

      const [commitsJson, pullsJson, branchesJson, actionsJson] = await Promise.all([
        commitsRes.json(),
        pullsRes.json(),
        branchesRes.json(),
        actionsRes.json(),
      ]);

      setCommits(commitsJson.data ?? []);
      setPullRequests(pullsJson.data ?? []);
      setBranches(branchesJson.data ?? []);
      setActionRuns(actionsJson.data ?? []);
      setGitLastFetched(new Date().toISOString());
    } catch (err: any) {
      setGitError(err.message ?? "Failed to fetch git data");
    } finally {
      setGitLoading(false);
    }
  }, [orgId, accessToken, projectId, primaryRepo, setCommits, setPullRequests, setBranches, setActionRuns, setGitLoading, setGitError, setGitLastFetched]);

  useEffect(() => {
    if (primaryRepo) fetchGitData();
  }, [primaryRepo?.id, fetchGitData]);

  const toggle = (section: Section) =>
    setExpanded((prev) => ({ ...prev, [section]: !prev[section] }));

  // Not loaded yet
  if (!installationChecked) {
    return (
      <div className="flex items-center justify-center h-64 text-[13px] text-text-tertiary">
        Loading...
      </div>
    );
  }

  // No repo connected
  if (projectRepos.length === 0) {
    return (
      <GitHubConnectCard
        projectId={projectId}
        hasInstallation={hasInstallation}
        isConfigured={isConfigured}
        onConnected={fetchGitData}
        onDisconnected={() => {
          setHasInstallation(false);
          setGitHubRepos([]);
          setCommits([]);
          setPullRequests([]);
          setBranches([]);
          setActionRuns([]);
        }}
      />
    );
  }

  const openPrCount = pullRequests.filter((pr) => pr.state === "open").length;

  const sections: { id: Section; label: string; icon: typeof GitCommitIcon; badge?: number }[] = [
    { id: "commits", label: "Recent Commits", icon: GitCommitIcon, badge: commits.length },
    { id: "pulls", label: "Pull Requests", icon: GitPullRequestIcon, badge: openPrCount },
    { id: "branches", label: "Branches", icon: GitBranchIcon, badge: branches.length },
    { id: "actions", label: "CI / Actions", icon: PlayIcon },
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <FolderGit2Icon className="size-4 text-text-secondary" />
          <a
            href={`https://github.com/${primaryRepo.full_name}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] font-medium text-text-primary hover:text-accent transition-colors"
          >
            {primaryRepo.full_name}
          </a>
          <span className="text-[11px] text-text-tertiary px-1.5 py-0.5 rounded bg-surface-tertiary">
            {primaryRepo.default_branch}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {gitLastFetched && (
            <span className="text-[11px] text-text-tertiary">
              Updated {new Date(gitLastFetched).toLocaleTimeString()}
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={fetchGitData}
            disabled={gitLoading}
            className="h-7 text-[12px]"
          >
            <RefreshCwIcon className={`size-3 mr-1 ${gitLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {gitError && (
        <div className="mx-6 mt-3 px-3 py-2 rounded-md bg-red-50 border border-red-200 text-[12px] text-red-700">
          {gitError}
        </div>
      )}

      {/* Sections */}
      <div className="px-6 py-4 space-y-2">
        {sections.map((section) => {
          const Icon = section.icon;
          const isOpen = expanded[section.id];
          const Chevron = isOpen ? ChevronDownIcon : ChevronRightIcon;
          return (
            <div
              key={section.id}
              className="border border-border-subtle rounded-radius-md overflow-hidden"
            >
              <button
                onClick={() => toggle(section.id)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-surface-tertiary/40 transition-colors"
              >
                <Chevron className="size-3.5 text-text-tertiary" />
                <Icon className="size-3.5 text-text-secondary" />
                <span className="text-[13px] font-medium text-text-primary flex-1 text-left">
                  {section.label}
                </span>
                {section.badge !== undefined && (
                  <span className="text-[11px] text-text-tertiary tabular-nums">
                    {section.badge}
                  </span>
                )}
              </button>
              {isOpen && (
                <div className="border-t border-border-subtle">
                  {section.id === "commits" && <CommitList commits={commits} />}
                  {section.id === "pulls" && <PullRequestList pullRequests={pullRequests} />}
                  {section.id === "branches" && (
                    <BranchList
                      branches={branches}
                      defaultBranch={primaryRepo.default_branch}
                    />
                  )}
                  {section.id === "actions" && <ActionsStatus runs={actionRuns} />}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
