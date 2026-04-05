"use client";

import type { GitActionRun } from "@/stores/project-store";
import {
  CheckCircle2Icon,
  XCircleIcon,
  LoaderIcon,
  CircleDotIcon,
} from "lucide-react";

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

function conclusionIcon(conclusion: string | null, status: string | null) {
  if (status === "in_progress" || status === "queued") {
    return <LoaderIcon className="size-3.5 text-amber-500 animate-spin" />;
  }
  switch (conclusion) {
    case "success":
      return <CheckCircle2Icon className="size-3.5 text-green-500" />;
    case "failure":
      return <XCircleIcon className="size-3.5 text-red-500" />;
    case "cancelled":
      return <CircleDotIcon className="size-3.5 text-text-tertiary" />;
    default:
      return <CircleDotIcon className="size-3.5 text-amber-500" />;
  }
}

export function ActionsStatus({ runs }: { runs: GitActionRun[] }) {
  if (runs.length === 0) {
    return (
      <p className="text-[13px] text-text-tertiary py-6 text-center">
        No workflow runs found
      </p>
    );
  }

  return (
    <div className="divide-y divide-border-subtle">
      {runs.map((run) => (
        <a
          key={run.id}
          href={run.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-tertiary/40 transition-colors"
        >
          {conclusionIcon(run.conclusion, run.status)}
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-text-primary truncate">
              {run.name ?? "Workflow"}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] text-text-tertiary">{run.head_branch}</span>
              {run.head_sha && (
                <code className="text-[11px] text-text-tertiary font-mono">{run.head_sha}</code>
              )}
              <span className="text-[11px] text-text-tertiary">{run.event}</span>
              <span className="text-[11px] text-text-tertiary">{timeAgo(run.created_at)}</span>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
