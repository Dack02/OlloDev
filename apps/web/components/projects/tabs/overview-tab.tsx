"use client";

import { useProjectStore, type Project } from "@/stores/project-store";
import {
  BugIcon,
  TicketIcon,
  CodeIcon,
  FileIcon,
  TrendingUpIcon,
  AlertCircleIcon,
  CheckCircle2Icon,
  ClockIcon,
} from "lucide-react";

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3.5 rounded-radius-sm border border-border-subtle bg-surface-elevated">
      <div className={`size-8 rounded-radius-sm flex items-center justify-center ${color}`}>
        <Icon className="size-4" />
      </div>
      <div>
        <p className="text-[18px] font-semibold text-text-primary tabular-nums leading-none">
          {value}
        </p>
        <p className="text-[11px] text-text-tertiary mt-1">{label}</p>
      </div>
    </div>
  );
}

interface ProjectOverviewTabProps {
  project: Project;
}

export function ProjectOverviewTab({ project }: ProjectOverviewTabProps) {
  const { tasks, bugs, tickets, files, updates } = useProjectStore();

  const projectTasks = tasks.filter((t) => t.project_id === project.id);
  const projectBugs = bugs.filter((b) => b.project_id === project.id);
  const projectTickets = tickets.filter((t) => t.project_id === project.id);
  const projectFiles = files.filter((f) => f.project_id === project.id);
  const projectUpdates = updates.filter((u) => u.project_id === project.id);

  const openBugs = projectBugs.filter(
    (b) => b.status !== "fixed" && b.status !== "closed"
  ).length;
  const activeTasks = projectTasks.filter(
    (t) => t.status === "in_progress" || t.status === "review"
  ).length;
  const openTickets = projectTickets.filter(
    (t) => t.status !== "resolved" && t.status !== "closed"
  ).length;
  const completedTasks = projectTasks.filter((t) => t.status === "done").length;
  const totalTasks = projectTasks.length;
  const pct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-6 py-5 space-y-6">
        {/* Description */}
        <p className="text-[13px] text-text-secondary leading-relaxed max-w-2xl">
          {project.description}
        </p>

        {/* Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-medium text-text-secondary">
              Overall progress
            </span>
            <span className="text-[12px] font-semibold text-text-primary tabular-nums">
              {pct}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-surface-tertiary overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-[11px] text-text-tertiary mt-1.5">
            {completedTasks} of {totalTasks} dev items completed
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Open bugs"
            value={openBugs}
            icon={BugIcon}
            color="bg-error-muted text-error"
          />
          <StatCard
            label="Active dev items"
            value={activeTasks}
            icon={CodeIcon}
            color="bg-accent-muted text-accent"
          />
          <StatCard
            label="Open tickets"
            value={openTickets}
            icon={TicketIcon}
            color="bg-warning-muted text-warning"
          />
          <StatCard
            label="Files"
            value={projectFiles.length}
            icon={FileIcon}
            color="bg-info-muted text-info"
          />
        </div>

        {/* Recent activity */}
        {projectUpdates.length > 0 && (
          <div>
            <h3 className="text-[12px] font-semibold uppercase tracking-wider text-text-tertiary mb-3">
              Recent updates
            </h3>
            <div className="space-y-3">
              {projectUpdates.map((update) => {
                const typeConfig = {
                  milestone: {
                    icon: CheckCircle2Icon,
                    bg: "bg-success-muted",
                    color: "text-success",
                  },
                  blocker: {
                    icon: AlertCircleIcon,
                    bg: "bg-error-muted",
                    color: "text-error",
                  },
                  progress: {
                    icon: TrendingUpIcon,
                    bg: "bg-accent-muted",
                    color: "text-accent",
                  },
                  note: {
                    icon: ClockIcon,
                    bg: "bg-surface-tertiary",
                    color: "text-text-secondary",
                  },
                };
                const config = typeConfig[update.type];
                const Icon = config.icon;

                return (
                  <div
                    key={update.id}
                    className="flex gap-3 p-3 rounded-radius-sm border border-border-subtle bg-surface-elevated"
                  >
                    <div
                      className={`size-7 rounded-radius-sm flex items-center justify-center shrink-0 ${config.bg} ${config.color}`}
                    >
                      <Icon className="size-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-medium text-text-primary truncate">
                          {update.title}
                        </p>
                        <span className="text-[11px] text-text-tertiary shrink-0">
                          {new Date(update.created_at).toLocaleDateString("en", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      <p className="text-[12px] text-text-secondary mt-0.5 leading-relaxed">
                        {update.body}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
