"use client";

import type { GitCommit } from "@/stores/project-store";
import { GitCommitIcon } from "lucide-react";

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
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

export function CommitList({ commits }: { commits: GitCommit[] }) {
  if (commits.length === 0) {
    return (
      <p className="text-[13px] text-text-tertiary py-6 text-center">
        No commits found
      </p>
    );
  }

  return (
    <div className="divide-y divide-border-subtle">
      {commits.map((commit) => {
        const firstLine = commit.message.split("\n")[0];
        return (
          <a
            key={commit.sha}
            href={commit.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 px-4 py-3 hover:bg-surface-tertiary/40 transition-colors"
          >
            {commit.author_avatar ? (
              <img
                src={commit.author_avatar}
                alt={commit.author_login}
                className="size-6 rounded-full mt-0.5 shrink-0"
              />
            ) : (
              <div className="size-6 rounded-full bg-surface-tertiary mt-0.5 shrink-0 flex items-center justify-center">
                <GitCommitIcon className="size-3 text-text-tertiary" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[13px] text-text-primary truncate">{firstLine}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-text-tertiary">{commit.author_login}</span>
                <span className="text-[11px] text-text-tertiary">
                  <code className="font-mono">{commit.sha.slice(0, 7)}</code>
                </span>
                <span className="text-[11px] text-text-tertiary">{timeAgo(commit.date)}</span>
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
}
