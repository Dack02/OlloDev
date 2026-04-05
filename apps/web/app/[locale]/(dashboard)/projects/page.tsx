"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useProjectStore } from "@/stores/project-store";
import { useAuth } from "@/lib/auth-context";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { EditProjectDialog } from "@/components/projects/edit-project-dialog";
import { DeleteProjectDialog } from "@/components/projects/delete-project-dialog";
import {
  PlusIcon,
  CheckCircle2Icon,
  ClockIcon,
  PauseCircleIcon,
  CircleDotIcon,
  TriangleAlertIcon,
  ArrowUpIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const statusLabel = {
  planning: { label: "Planning", icon: ClockIcon, color: "text-text-tertiary", bg: "bg-surface-tertiary" },
  active: { label: "Active", icon: CircleDotIcon, color: "text-accent", bg: "bg-accent-muted" },
  paused: { label: "Paused", icon: PauseCircleIcon, color: "text-warning", bg: "bg-warning-muted" },
  completed: { label: "Completed", icon: CheckCircle2Icon, color: "text-success", bg: "bg-success-muted" },
} as const;

const priorityLabel = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
} as const;

const healthLabel = {
  on_track: { label: "On track", className: "bg-success-muted text-success" },
  at_risk: { label: "At risk", className: "bg-warning-muted text-warning" },
  off_track: { label: "Off track", className: "bg-error-muted text-error" },
} as const;

export default function ProjectsPage() {
  const locale = useLocale();
  const { projects, setProjects } = useProjectStore();
  const { org, accessToken, loading } = useAuth();
  const orgId = org?.id;

  useEffect(() => {
    if (loading || !orgId || !accessToken) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/projects?limit=100`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to fetch projects: ${r.status}`);
        return r.json();
      })
      .then((json) => {
        if (json?.data) setProjects(json.data);
      })
      .catch((err) => console.error("[ProjectsPage]", err));
  }, [loading, orgId, accessToken, setProjects]);

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
            const health = healthLabel[project.health];

            return (
              <div
                key={project.id}
                className="group flex flex-col p-4 rounded-radius-md border border-border-subtle bg-surface-elevated hover:border-border-strong hover:shadow-sm transition-all"
              >
                {/* Project name + status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="size-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: project.color }}
                    />
                    <Link
                      href={`/${locale}/projects/${project.id}`}
                      className="min-w-0"
                    >
                      <h3 className="text-[14px] font-semibold text-text-primary truncate group-hover:text-accent transition-colors">
                        {project.name}
                      </h3>
                    </Link>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-md shrink-0 ${status.bg} ${status.color}`}>
                      <StatusIcon className="size-3" />
                      {status.label}
                    </span>
                    <EditProjectDialog
                      project={project}
                      trigger={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`Edit ${project.name}`}
                        >
                          <PencilIcon className="size-3.5" />
                        </Button>
                      }
                    />
                    <DeleteProjectDialog
                      project={project}
                      trigger={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`Delete ${project.name}`}
                        >
                          <Trash2Icon className="size-3.5 text-error" />
                        </Button>
                      }
                    />
                  </div>
                </div>

                {/* Description */}
                <p className="text-[12px] text-text-secondary mt-2 line-clamp-2 leading-relaxed">
                  {project.description || "No description yet."}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                  <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 font-medium ${health.className}`}>
                    {health.label}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-surface-tertiary px-1.5 py-0.5 text-text-secondary">
                    <ArrowUpIcon className="size-3" />
                    {priorityLabel[project.priority]}
                  </span>
                  {project.target_date && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-surface-tertiary px-1.5 py-0.5 text-text-secondary">
                      <TriangleAlertIcon className="size-3" />
                      Due {new Date(project.target_date).toLocaleDateString("en", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                </div>

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
                  {project.client_name && <span>{project.client_name}</span>}
                  <span>
                    Updated {new Date(project.updated_at).toLocaleDateString("en", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
