"use client";

import { useProjectStore, type ProjectTask } from "@/stores/project-store";
import { DetailPanel } from "@/components/layout/detail-panel";
import {
  CheckCircle2Icon,
  CircleIcon,
  CircleDotIcon,
  ClockIcon,
  AlertCircleIcon,
  ArrowUpIcon,
  ArrowRightIcon,
  ArrowDownIcon,
  CalendarIcon,
  TagIcon,
  UserIcon,
} from "lucide-react";

const statusConfig = {
  backlog: { label: "Backlog", icon: CircleIcon, color: "text-text-tertiary", bg: "bg-surface-tertiary" },
  todo: { label: "To do", icon: CircleIcon, color: "text-text-tertiary", bg: "bg-surface-tertiary" },
  in_progress: { label: "In progress", icon: CircleDotIcon, color: "text-accent", bg: "bg-accent-muted" },
  review: { label: "Review", icon: ClockIcon, color: "text-warning", bg: "bg-warning-muted" },
  done: { label: "Done", icon: CheckCircle2Icon, color: "text-success", bg: "bg-success-muted" },
} as const;

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

export function TaskDetailPanel() {
  const { activeTaskId, tasks, detailPanelOpen, setDetailPanelOpen, setActiveTask } = useProjectStore();

  const task = tasks.find((t) => t.id === activeTaskId);

  if (!task) {
    // Show empty state when no task selected but panel is open
    if (detailPanelOpen) {
      return (
        <DetailPanel
          open={detailPanelOpen}
          onClose={() => setDetailPanelOpen(false)}
          title="Details"
          width="w-[360px]"
        >
          <div className="flex flex-col items-center justify-center h-full px-6 text-center">
            <p className="text-[13px] text-text-tertiary">
              Select a task to see its details
            </p>
          </div>
        </DetailPanel>
      );
    }
    return null;
  }

  const status = statusConfig[task.status];
  const priority = priorityConfig[task.priority];
  const StatusIcon = status.icon;
  const PriorityIcon = priority.icon;

  return (
    <DetailPanel
      open={detailPanelOpen}
      onClose={() => {
        setDetailPanelOpen(false);
        setActiveTask(null);
      }}
      title={task.title}
      width="w-[360px]"
    >
      <div className="px-5 py-3">
        {/* Description */}
        {task.description && (
          <p className="text-[13px] text-text-secondary leading-relaxed mb-4">
            {task.description}
          </p>
        )}

        {/* Properties */}
        <div className="divide-y divide-border-subtle">
          <DetailRow label="Status">
            <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium px-2 py-0.5 rounded-md ${status.bg} ${status.color}`}>
              <StatusIcon className="size-3" />
              {status.label}
            </span>
          </DetailRow>

          <DetailRow label="Priority">
            <span className={`inline-flex items-center gap-1 text-[12px] font-medium ${priority.color}`}>
              <PriorityIcon className="size-3" />
              {priority.label}
            </span>
          </DetailRow>

          <DetailRow label="Assignee">
            {task.assignee_id ? (
              <span className="inline-flex items-center gap-1.5 text-[12px] text-text-primary">
                <span className="size-5 rounded-full bg-accent-muted flex items-center justify-center text-[9px] font-semibold text-accent">
                  L
                </span>
                Leo
              </span>
            ) : (
              <span className="text-[12px] text-text-tertiary">Unassigned</span>
            )}
          </DetailRow>

          {task.due_at && (
            <DetailRow label="Due date">
              <span className="inline-flex items-center gap-1 text-[12px] text-text-primary">
                <CalendarIcon className="size-3 text-text-tertiary" />
                {new Date(task.due_at).toLocaleDateString("en", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </DetailRow>
          )}

          {task.tags.length > 0 && (
            <DetailRow label="Tags">
              <div className="flex flex-wrap gap-1 justify-end">
                {task.tags.map((tag) => (
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
              {new Date(task.created_at).toLocaleDateString("en", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </DetailRow>

          <DetailRow label="Updated">
            <span className="text-[12px] text-text-secondary">
              {new Date(task.updated_at).toLocaleDateString("en", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </DetailRow>
        </div>
      </div>
    </DetailPanel>
  );
}
