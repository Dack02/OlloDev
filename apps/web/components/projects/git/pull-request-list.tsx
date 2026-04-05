"use client";

import type { GitPullRequest } from "@/stores/project-store";
import { GitPullRequestIcon, GitMergeIcon, CircleDotIcon } from "lucide-react";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en", { month: "short", day: "numeric" });
}

const stateConfig = {
  open: { icon: GitPullRequestIcon, color: "text-green-500", label: "Open" },
  merged: { icon: GitMergeIcon, color: "text-purple-500", label: "Merged" },
  closed: { icon: CircleDotIcon, color: "text-red-500", label: "Closed" },
} as const;

export function PullRequestList({ pullRequests }: { pullRequests: GitPullRequest[] }) {
  if (pullRequests.length === 0) {
    return (
      <p className="text-[13px] text-text-tertiary py-6 text-center">
        No pull requests found
      </p>
    );
  }

  return (
    <div className="divide-y divide-border-subtle">
      {pullRequests.map((pr) => {
        const config = stateConfig[pr.state] ?? stateConfig.open;
        const Icon = config.icon;
        return (
          <a
            key={pr.number}
            href={pr.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 px-4 py-3 hover:bg-surface-tertiary/40 transition-colors"
          >
            <Icon className={`size-4 mt-0.5 shrink-0 ${config.color}`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-[13px] text-text-primary truncate">{pr.title}</p>
                {pr.draft && (
                  <span className="shrink-0 px-1.5 py-0.5 text-[10px] rounded-full bg-surface-tertiary text-text-tertiary">
                    Draft
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-[11px] text-text-tertiary">
                  #{pr.number}
                </span>
                <span className="text-[11px] text-text-tertiary">
                  {pr.author_login}
                </span>
                <span className="text-[11px] text-text-tertiary">
                  {pr.head_ref} &rarr; {pr.base_ref}
                </span>
                <span className="text-[11px] text-text-tertiary">
                  {timeAgo(pr.updated_at)}
                </span>
                {pr.requested_reviewers.length > 0 && (
                  <span className="text-[11px] text-text-tertiary">
                    reviewers: {pr.requested_reviewers.join(", ")}
                  </span>
                )}
              </div>
            </div>
            {(pr.additions !== undefined || pr.deletions !== undefined) && (
              <div className="shrink-0 text-[11px] font-mono text-text-tertiary mt-0.5">
                <span className="text-green-500">+{pr.additions ?? 0}</span>{" "}
                <span className="text-red-500">-{pr.deletions ?? 0}</span>
              </div>
            )}
          </a>
        );
      })}
    </div>
  );
}
