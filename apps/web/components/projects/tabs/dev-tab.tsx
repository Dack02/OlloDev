"use client";

import { useState } from "react";
import {
  useProjectStore,
  type ProjectTask,
  type DevItemType,
  type DevItemStatus,
  type Priority,
} from "@/stores/project-store";
import { DetailPanel } from "@/components/layout/detail-panel";
import { FilterBar } from "@/components/ui/filter-bar";
import { CreateTaskDialog } from "@/components/projects/create-task-dialog";
import { useAuth } from "@/lib/auth-context";
import { useOrgMembers } from "@/hooks/use-org-members";
import { cn } from "@/lib/utils";
import { notify } from "@/lib/notify";
import {
  CircleIcon,
  CircleDotIcon,
  CheckCircle2Icon,
  ClockIcon,
  InboxIcon,
  ArrowUpIcon,
  ArrowRightIcon,
  ArrowDownIcon,
  AlertCircleIcon,
  CalendarIcon,
  CodeIcon,
  LightbulbIcon,
  WrenchIcon,
  Trash2Icon,
} from "lucide-react";

const statusConfig: Record<
  DevItemStatus,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string }
> = {
  backlog: { label: "Backlog", icon: InboxIcon, color: "text-text-tertiary", bg: "bg-surface-tertiary" },
  todo: { label: "To do", icon: CircleIcon, color: "text-text-tertiary", bg: "bg-surface-tertiary" },
  in_progress: { label: "In progress", icon: CircleDotIcon, color: "text-accent", bg: "bg-accent-muted" },
  review: { label: "Review", icon: ClockIcon, color: "text-warning", bg: "bg-warning-muted" },
  done: { label: "Done", icon: CheckCircle2Icon, color: "text-success", bg: "bg-success-muted" },
};

const typeConfig: Record<
  DevItemType,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  task: { label: "Task", icon: CodeIcon, color: "text-accent" },
  idea: { label: "Idea", icon: LightbulbIcon, color: "text-warning" },
  improvement: { label: "Improvement", icon: WrenchIcon, color: "text-info" },
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

interface DevTabProps {
  projectId: string;
}

export function DevTab({ projectId }: DevTabProps) {
  const { tasks, activeTaskId, setActiveTask, detailPanelOpen, setDetailPanelOpen, updateTask, setTasks } =
    useProjectStore();
  const { org, accessToken } = useAuth();
  const orgId = org?.id;
  const members = useOrgMembers();
  const [typeFilter, setTypeFilter] = useState("all");

  const projectTasks = tasks.filter((t) => t.project_id === projectId);

  const filterTabs = [
    { value: "all", label: "All", count: projectTasks.length },
    { value: "task", label: "Tasks", count: projectTasks.filter((t) => t.type === "task").length },
    { value: "idea", label: "Ideas", count: projectTasks.filter((t) => t.type === "idea").length },
    {
      value: "improvement",
      label: "Improvements",
      count: projectTasks.filter((t) => t.type === "improvement").length,
    },
  ];

  const filtered =
    typeFilter === "all"
      ? projectTasks
      : projectTasks.filter((t) => t.type === typeFilter);

  // Group by status
  const statusOrder: DevItemStatus[] = [
    "in_progress",
    "review",
    "todo",
    "backlog",
    "done",
  ];

  const grouped = statusOrder
    .map((s) => ({
      status: s,
      items: filtered.filter((t) => t.status === s),
    }))
    .filter((g) => g.items.length > 0);

  const activeTask = tasks.find((t) => t.id === activeTaskId);

  const handleUpdate = async (
    taskId: string,
    updates: Partial<ProjectTask>
  ) => {
    // Update local store immediately
    updateTask(taskId, updates);

    // Try API call if credentials available
    if (orgId && accessToken) {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/projects/${projectId}/tasks/${taskId}`,
          {
            method: "PATCH",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updates),
          }
        );
        if (!response.ok) {
          notify.error("Update failed", "Could not update task");
        }
      } catch (error) {
        notify.error("Update failed", "Could not reach the server");
      }
    }
  };

  const handleDelete = async (taskId: string) => {
    // Try API call if credentials available
    if (orgId && accessToken) {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/projects/${projectId}/tasks/${taskId}`,
          {
            method: "DELETE",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
            },
          }
        );
        if (!response.ok) {
          notify.error("Delete failed", "Could not delete task");
        }
      } catch (error) {
        notify.error("Delete failed", "Could not reach the server");
      }
    }

    // Remove from local store
    setTasks(tasks.filter((t) => t.id !== taskId));
    setDetailPanelOpen(false);
    setActiveTask(null);
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* List */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <FilterBar>
          <FilterBar.Tabs
            items={filterTabs}
            value={typeFilter}
            onChange={setTypeFilter}
          />
          <FilterBar.Actions>
            <CreateTaskDialog projectId={projectId} />
          </FilterBar.Actions>
        </FilterBar>

        <div className="flex-1 overflow-y-auto">
          {grouped.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="size-10 rounded-xl bg-surface-secondary flex items-center justify-center mb-3">
                <CodeIcon className="size-4 text-text-tertiary" />
              </div>
              <p className="text-[13px] text-text-tertiary">No items found</p>
            </div>
          ) : (
            grouped.map((group) => {
              const status = statusConfig[group.status];
              return (
                <div key={group.status} className="py-1">
                  <div className="px-4 py-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                      {status.label}
                    </span>
                  </div>
                  {group.items.map((task) => {
                    const StatusIcon = status.icon;
                    const typeInfo = typeConfig[task.type];
                    const TypeIcon = typeInfo.icon;
                    const priority = priorityConfig[task.priority];
                    const PriorityIcon = priority.icon;
                    const isActive = activeTaskId === task.id;

                    return (
                      <button
                        key={task.id}
                        onClick={() => {
                          setActiveTask(task.id);
                          setDetailPanelOpen(true);
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                          isActive
                            ? "bg-accent-muted"
                            : "hover:bg-surface-secondary/60"
                        )}
                      >
                        <StatusIcon className={cn("size-4 shrink-0", status.color)} />
                        <TypeIcon className={cn("size-3.5 shrink-0", typeInfo.color)} />
                        <span
                          className={cn(
                            "flex-1 text-[13px] min-w-0 truncate",
                            task.status === "done"
                              ? "text-text-tertiary line-through"
                              : "text-text-primary"
                          )}
                        >
                          {task.title}
                        </span>
                        <PriorityIcon className={cn("size-3.5 shrink-0", priority.color)} />
                        {task.due_at && (
                          <span className="text-[11px] text-text-tertiary shrink-0">
                            {new Date(task.due_at).toLocaleDateString("en", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Detail panel */}
      {activeTask && (
        <DetailPanel
          open={detailPanelOpen}
          onClose={() => {
            setDetailPanelOpen(false);
            setActiveTask(null);
          }}
          title={activeTask.title}
          width="w-[360px]"
        >
          <div className="px-5 py-3">
            {activeTask.description && (
              <p className="text-[13px] text-text-secondary leading-relaxed mb-4">
                {activeTask.description}
              </p>
            )}

            <div className="divide-y divide-border-subtle">
              <DetailRow label="Type">
                <select
                  className="h-7 rounded-md border border-border-subtle bg-surface-primary px-2 text-[12px] text-text-primary focus:outline-none"
                  value={activeTask.type}
                  onChange={(e) => handleUpdate(activeTask.id, { type: e.target.value as DevItemType })}
                >
                  {Object.entries(typeConfig).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </DetailRow>

              <DetailRow label="Status">
                <select
                  className="h-7 rounded-md border border-border-subtle bg-surface-primary px-2 text-[12px] text-text-primary focus:outline-none"
                  value={activeTask.status}
                  onChange={(e) => handleUpdate(activeTask.id, { status: e.target.value as DevItemStatus })}
                >
                  {Object.entries(statusConfig).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </DetailRow>

              <DetailRow label="Priority">
                <select
                  className="h-7 rounded-md border border-border-subtle bg-surface-primary px-2 text-[12px] text-text-primary focus:outline-none"
                  value={activeTask.priority}
                  onChange={(e) => handleUpdate(activeTask.id, { priority: e.target.value as Priority })}
                >
                  {Object.entries(priorityConfig).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </DetailRow>

              <DetailRow label="Assignee">
                {activeTask.assignee_id ? (() => {
                  const member = members.get(activeTask.assignee_id!);
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

              {activeTask.due_at && (
                <DetailRow label="Due date">
                  <span className="inline-flex items-center gap-1 text-[12px] text-text-primary">
                    <CalendarIcon className="size-3 text-text-tertiary" />
                    {new Date(activeTask.due_at).toLocaleDateString("en", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </DetailRow>
              )}

              {activeTask.tags.length > 0 && (
                <DetailRow label="Tags">
                  <div className="flex flex-wrap gap-1 justify-end">
                    {activeTask.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[11px] font-medium px-1.5 py-0.5 rounded-md bg-surface-tertiary text-text-secondary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </DetailRow>
              )}

              <DetailRow label="Created">
                <span className="text-[12px] text-text-secondary">
                  {new Date(activeTask.created_at).toLocaleDateString("en", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </DetailRow>
            </div>

            <div className="mt-4 pt-4 border-t border-border-subtle">
              <button
                onClick={() => handleDelete(activeTask.id)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-error-muted text-error hover:bg-error-muted/80 transition-colors text-[12px] font-medium"
              >
                <Trash2Icon className="size-4" />
                Delete
              </button>
            </div>
          </div>
        </DetailPanel>
      )}
    </div>
  );
}
