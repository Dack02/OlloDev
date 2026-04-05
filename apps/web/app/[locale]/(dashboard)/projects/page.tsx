"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { useProjectStore } from "@/stores/project-store";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import {
  FolderIcon,
  PlusIcon,
  CheckCircle2Icon,
  ClockIcon,
  PauseCircleIcon,
  CircleDotIcon,
} from "lucide-react";

const statusLabel = {
  planning: { label: "Planning", icon: ClockIcon, color: "text-text-tertiary", bg: "bg-surface-tertiary" },
  active: { label: "Active", icon: CircleDotIcon, color: "text-accent", bg: "bg-accent-muted" },
  paused: { label: "Paused", icon: PauseCircleIcon, color: "text-warning", bg: "bg-warning-muted" },
  completed: { label: "Completed", icon: CheckCircle2Icon, color: "text-success", bg: "bg-success-muted" },
} as const;

export default function ProjectsPage() {
  const locale = useLocale();
  const { projects } = useProjectStore();

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4">
        <h1 className="text-[20px] font-semibold text-text-primary tracking-tight">
          Projects
        </h1>
        <CreateProjectDialog
          trigger={
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-radius-sm bg-accent text-white text-[13px] font-medium hover:bg-accent-hover transition-colors">
              <PlusIcon className="size-3.5" />
              New project
            </button>
          }
        />
      </div>

      {/* Project grid */}
      <div className="px-6 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {projects.map((project) => {
            const status = statusLabel[project.status];
            const StatusIcon = status.icon;
            const pct = project.task_count > 0
              ? Math.round((project.completed_task_count / project.task_count) * 100)
              : 0;

            return (
              <Link
                key={project.id}
                href={`/${locale}/projects/${project.id}`}
                className="group flex flex-col p-4 rounded-radius-md border border-border-subtle bg-surface-elevated hover:border-border-strong hover:shadow-sm transition-all"
              >
                {/* Project name + status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="size-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: project.color }}
                    />
                    <h3 className="text-[14px] font-semibold text-text-primary truncate group-hover:text-accent transition-colors">
                      {project.name}
                    </h3>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-md shrink-0 ${status.bg} ${status.color}`}>
                    <StatusIcon className="size-3" />
                    {status.label}
                  </span>
                </div>

                {/* Description */}
                <p className="text-[12px] text-text-secondary mt-2 line-clamp-2 leading-relaxed">
                  {project.description}
                </p>

                {/* Progress bar */}
                <div className="mt-3 flex items-center gap-2.5">
                  <div className="flex-1 h-1 rounded-full bg-surface-tertiary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-text-tertiary font-medium tabular-nums">
                    {pct}%
                  </span>
                </div>

                {/* Task count */}
                <div className="flex items-center gap-3 mt-2.5 text-[11px] text-text-tertiary">
                  <span>{project.completed_task_count}/{project.task_count} tasks</span>
                  <span>
                    Updated {new Date(project.updated_at).toLocaleDateString("en", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
