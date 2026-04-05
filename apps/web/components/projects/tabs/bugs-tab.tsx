"use client";

import { useState } from "react";
import {
  useProjectStore,
  type ProjectBug,
  type BugStatus,
  type BugSeverity,
} from "@/stores/project-store";
import { DetailPanel } from "@/components/layout/detail-panel";
import { FilterBar } from "@/components/ui/filter-bar";
import { useAuth } from "@/lib/auth-context";
import { useOrgMembers } from "@/hooks/use-org-members";
import { cn } from "@/lib/utils";
import { notify } from "@/lib/notify";
import { CreateBugDialog } from "@/components/projects/create-bug-dialog";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  BugIcon,
  CircleIcon,
  CircleDotIcon,
  CheckCircle2Icon,
  XCircleIcon,
  ShieldCheckIcon,
  ArrowUpIcon,
  ArrowRightIcon,
  ArrowDownIcon,
  AlertCircleIcon,
  CalendarIcon,
  UserIcon,
  TagIcon,
  TrashIcon,
  MessageSquareIcon,
} from "lucide-react";

const statusConfig: Record<
  BugStatus,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string }
> = {
  open: { label: "Open", icon: CircleIcon, color: "text-error", bg: "bg-error-muted" },
  confirmed: { label: "Confirmed", icon: ShieldCheckIcon, color: "text-warning", bg: "bg-warning-muted" },
  in_progress: { label: "In progress", icon: CircleDotIcon, color: "text-accent", bg: "bg-accent-muted" },
  fixed: { label: "Fixed", icon: CheckCircle2Icon, color: "text-success", bg: "bg-success-muted" },
  closed: { label: "Closed", icon: XCircleIcon, color: "text-text-tertiary", bg: "bg-surface-tertiary" },
};

const severityConfig: Record<BugSeverity, { label: string; color: string }> = {
  critical: { label: "Critical", color: "text-error" },
  high: { label: "High", color: "text-warning" },
  medium: { label: "Medium", color: "text-info" },
  low: { label: "Low", color: "text-text-tertiary" },
};

const priorityConfig = {
  low: { label: "Low", icon: ArrowDownIcon, color: "text-text-tertiary" },
  medium: { label: "Medium", icon: ArrowRightIcon, color: "text-info" },
  high: { label: "High", icon: ArrowUpIcon, color: "text-warning" },
  urgent: { label: "Urgent", icon: AlertCircleIcon, color: "text-error" },
} as const;

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2.5">
      <span className="text-[12px] text-text-tertiary">{label}</span>
      <div className="text-right">{children}</div>
    </div>
  );
}

interface BugsTabProps {
  projectId: string;
}

export function BugsTab({ projectId }: BugsTabProps) {
  const { bugs, activeBugId, setActiveBug, updateBug, detailPanelOpen, setDetailPanelOpen, setBugs } =
    useProjectStore();
  const { org, accessToken } = useAuth();
  const orgId = org?.id;
  const members = useOrgMembers();
  const params = useParams();
  const [statusFilter, setStatusFilter] = useState("all");

  const handleUpdate = async (bugId: string, updates: Partial<ProjectBug>) => {
    updateBug(bugId, updates);
    if (orgId && accessToken) {
      try {
        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/projects/${projectId}/bugs/${bugId}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updates),
          }
        );
      } catch (error) {
        notify.error("Update failed", "Could not update bug report");
      }
    }
  };

  const handleDelete = async (bugId: string) => {
    if (orgId && accessToken) {
      try {
        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/projects/${projectId}/bugs/${bugId}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
      } catch (error) {
        notify.error("Delete failed", "Could not delete bug report");
      }
    }
    setBugs(bugs.filter((b) => b.id !== bugId));
    setDetailPanelOpen(false);
    setActiveBug(null);
  };

  const projectBugs = bugs.filter((b) => b.project_id === projectId);

  const filterTabs = [
    { value: "all", label: "All", count: projectBugs.length },
    {
      value: "open",
      label: "Open",
      count: projectBugs.filter(
        (b) => b.status !== "fixed" && b.status !== "closed"
      ).length,
    },
    {
      value: "fixed",
      label: "Fixed",
      count: projectBugs.filter((b) => b.status === "fixed").length,
    },
    {
      value: "closed",
      label: "Closed",
      count: projectBugs.filter((b) => b.status === "closed").length,
    },
  ];

  const filtered =
    statusFilter === "all"
      ? projectBugs
      : statusFilter === "open"
      ? projectBugs.filter(
          (b) => b.status !== "fixed" && b.status !== "closed"
        )
      : projectBugs.filter((b) => b.status === statusFilter);

  const activeBug = bugs.find((b) => b.id === activeBugId);

  return (
    <div className="flex h-full overflow-hidden">
      {/* List */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <FilterBar>
          <FilterBar.Tabs
            items={filterTabs}
            value={statusFilter}
            onChange={setStatusFilter}
          />
          <FilterBar.Actions>
            <CreateBugDialog projectId={projectId} />
          </FilterBar.Actions>
        </FilterBar>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="size-10 rounded-xl bg-surface-secondary flex items-center justify-center mb-3">
                <BugIcon className="size-4 text-text-tertiary" />
              </div>
              <p className="text-[13px] text-text-tertiary">No bugs found</p>
            </div>
          ) : (
            filtered.map((bug) => {
              const status = statusConfig[bug.status];
              const severity = severityConfig[bug.severity];
              const StatusIcon = status.icon;
              const isActive = activeBugId === bug.id;

              return (
                <button
                  key={bug.id}
                  onClick={() => {
                    setActiveBug(bug.id);
                    setDetailPanelOpen(true);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-border-subtle",
                    isActive
                      ? "bg-accent-muted"
                      : "hover:bg-surface-secondary/60"
                  )}
                >
                  <StatusIcon className={cn("size-4 shrink-0", status.color)} />
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-[13px] truncate",
                        bug.status === "closed"
                          ? "text-text-tertiary line-through"
                          : "text-text-primary"
                      )}
                    >
                      {bug.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn("text-[11px] font-medium", severity.color)}>
                        {severity.label}
                      </span>
                      {bug.labels.length > 0 && (
                        <span className="text-[11px] text-text-tertiary">
                          {bug.labels[0]}
                          {bug.labels.length > 1 && ` +${bug.labels.length - 1}`}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] text-text-tertiary shrink-0">
                    {new Date(bug.created_at).toLocaleDateString("en", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Detail panel */}
      {activeBug && (
        <DetailPanel
          open={detailPanelOpen}
          onClose={() => {
            setDetailPanelOpen(false);
            setActiveBug(null);
          }}
          title={activeBug.title}
          width="w-[360px]"
        >
          <div className="px-5 py-3">
            {activeBug.description && (
              <p className="text-[13px] text-text-secondary leading-relaxed mb-4">
                {activeBug.description}
              </p>
            )}

            <div className="divide-y divide-border-subtle">
              <DetailRow label="Status">
                <select
                  value={activeBug.status}
                  onChange={(e) =>
                    handleUpdate(activeBug.id, {
                      status: e.target.value as BugStatus,
                    })
                  }
                  className={cn(
                    "text-[12px] font-medium px-2 py-0.5 rounded-md border-0 bg-transparent cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent/30",
                    statusConfig[activeBug.status].color
                  )}
                >
                  {(Object.keys(statusConfig) as BugStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {statusConfig[s].label}
                    </option>
                  ))}
                </select>
              </DetailRow>

              <DetailRow label="Severity">
                <select
                  value={activeBug.severity}
                  onChange={(e) =>
                    handleUpdate(activeBug.id, {
                      severity: e.target.value as BugSeverity,
                    })
                  }
                  className={cn(
                    "text-[12px] font-medium px-2 py-0.5 rounded-md border-0 bg-transparent cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent/30",
                    severityConfig[activeBug.severity].color
                  )}
                >
                  {(Object.keys(severityConfig) as BugSeverity[]).map((s) => (
                    <option key={s} value={s}>
                      {severityConfig[s].label}
                    </option>
                  ))}
                </select>
              </DetailRow>

              <DetailRow label="Priority">
                <select
                  value={activeBug.priority}
                  onChange={(e) =>
                    handleUpdate(activeBug.id, {
                      priority: e.target.value as "low" | "medium" | "high" | "urgent",
                    })
                  }
                  className={cn(
                    "text-[12px] font-medium px-2 py-0.5 rounded-md border-0 bg-transparent cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent/30",
                    priorityConfig[activeBug.priority].color
                  )}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </DetailRow>

              <DetailRow label="Assignee">
                {activeBug.assignee_id ? (() => {
                  const member = members.get(activeBug.assignee_id!);
                  const name = member?.display_name ?? "Unknown";
                  return (
                    <span className="inline-flex items-center gap-1.5 text-[12px] text-text-primary">
                      <span className="size-5 rounded-full bg-accent-muted flex items-center justify-center text-[9px] font-semibold text-accent">
                        {name.charAt(0).toUpperCase()}
                      </span>
                      {name}
                    </span>
                  );
                })() : (
                  <span className="text-[12px] text-text-tertiary">Unassigned</span>
                )}
              </DetailRow>

              {activeBug.labels.length > 0 && (
                <DetailRow label="Labels">
                  <div className="flex flex-wrap gap-1 justify-end">
                    {activeBug.labels.map((label) => (
                      <span
                        key={label}
                        className="text-[11px] font-medium px-1.5 py-0.5 rounded-md bg-surface-tertiary text-text-secondary"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </DetailRow>
              )}

              <DetailRow label="Created">
                <span className="text-[12px] text-text-secondary">
                  {new Date(activeBug.created_at).toLocaleDateString("en", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </DetailRow>

              {activeBug.discussion_id && (
                <DetailRow label="Thread">
                  <Link
                    href={`/${params.locale}/projects/${projectId}/discussions?id=${activeBug.discussion_id}`}
                    className="inline-flex items-center gap-1.5 text-[12px] font-medium text-accent hover:underline"
                  >
                    <MessageSquareIcon className="size-3" />
                    View thread
                  </Link>
                </DetailRow>
              )}
            </div>

            {/* Delete button */}
            <div className="mt-5 pt-4 border-t border-border-subtle">
              <button
                onClick={() => handleDelete(activeBug.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium text-error hover:bg-error-muted transition-colors"
              >
                <TrashIcon className="size-3.5" />
                Delete bug
              </button>
            </div>
          </div>
        </DetailPanel>
      )}
    </div>
  );
}
