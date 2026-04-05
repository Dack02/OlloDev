"use client";

import type { GitBranch } from "@/stores/project-store";
import { GitBranchIcon, ShieldIcon } from "lucide-react";

export function BranchList({
  branches,
  defaultBranch,
}: {
  branches: GitBranch[];
  defaultBranch: string;
}) {
  if (branches.length === 0) {
    return (
      <p className="text-[13px] text-text-tertiary py-6 text-center">
        No branches found
      </p>
    );
  }

  // Put default branch first
  const sorted = [...branches].sort((a, b) => {
    if (a.name === defaultBranch) return -1;
    if (b.name === defaultBranch) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="divide-y divide-border-subtle">
      {sorted.map((branch) => (
        <div
          key={branch.name}
          className="flex items-center gap-3 px-4 py-2.5"
        >
          <GitBranchIcon className="size-3.5 text-text-tertiary shrink-0" />
          <div className="min-w-0 flex-1 flex items-center gap-2">
            <span className="text-[13px] text-text-primary font-mono truncate">
              {branch.name}
            </span>
            {branch.name === defaultBranch && (
              <span className="shrink-0 px-1.5 py-0.5 text-[10px] rounded-full bg-accent-muted text-accent font-medium">
                default
              </span>
            )}
            {branch.protected && (
              <ShieldIcon className="size-3 text-amber-500 shrink-0" />
            )}
          </div>
          <code className="text-[11px] text-text-tertiary font-mono shrink-0">
            {branch.last_commit_sha.slice(0, 7)}
          </code>
        </div>
      ))}
    </div>
  );
}
