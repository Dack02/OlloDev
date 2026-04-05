"use client";

import { useProjectStore, type Project, type ProjectTask } from "@/stores/project-store";
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
  MessageCircleIcon,
  BookOpenIcon,
  TicketIcon,
} from "lucide-react";

const statusConfig = {
  backlog: { label: "Backlog", icon: CircleIcon, color: "text-text-tertiary" },
  todo: { label: "To do", icon: CircleIcon, color: "text-text-tertiary" },
  in_progress: { label: "In progress", icon: CircleDotIcon, color: "text-accent" },
  review: { label: "Review", icon: ClockIcon, color: "text-warning" },
  done: { label: "Done", icon: CheckCircle2Icon, color: "text-success" },
} as const;

const priorityConfig = {
  low: { label: "Low", icon: ArrowDownIcon, color: "text-text-tertiary" },
  medium: { label: "Medium", icon: ArrowRightIcon, color: "text-info" },
  high: { label: "High", icon: ArrowUpIcon, color: "text-warning" },
  urgent: { label: "Urgent", icon: AlertCircleIcon, color: "text-error" },
} as const;

function TaskRow({ task }: { task: ProjectTask }) {
  const { setActiveTask, activeTaskId, setDetailPanelOpen } = useProjectStore();
  const status = statusConfig[task.status];
  const priority = priorityConfig[task.priority];
  const StatusIcon = status.icon;
  const PriorityIcon = priority.icon;
  const isActive = activeTaskId === task.id;

  return (
    <button
      onClick={() => {
        setActiveTask(task.id);
        setDetailPanelOpen(true);
      }}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
        isActive
          ? "bg-accent-muted"
          : "hover:bg-surface-secondary/60"
      }`}
    >
      <StatusIcon className={`size-4 shrink-0 ${status.color}`} />
      <span className={`flex-1 text-[13px] min-w-0 truncate ${task.status === "done" ? "text-text-tertiary line-through" : "text-text-primary"}`}>
        {task.title}
      </span>
      <PriorityIcon className={`size-3.5 shrink-0 ${priority.color}`} />
      {task.due_at && (
        <span className="text-[11px] text-text-tertiary shrink-0">
          {new Date(task.due_at).toLocaleDateString("en", { month: "short", day: "numeric" })}
        </span>
      )}
    </button>
  );
}

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? (completed / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 rounded-full bg-surface-tertiary overflow-hidden">
        <div
          className="h-full rounded-full bg-accent transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] text-text-tertiary font-medium tabular-nums">
        {completed}/{total}
      </span>
    </div>
  );
}

interface ProjectOverviewProps {
  project: Project;
}

export function ProjectOverview({ project }: ProjectOverviewProps) {
  const { tasks, updates } = useProjectStore();
  const projectTasks = tasks.filter((t) => t.project_id === project.id);
  const projectUpdates = updates.filter((u) => u.project_id === project.id);

  const tasksByStatus = {
    todo: projectTasks.filter((t) => t.status === "todo"),
    in_progress: projectTasks.filter((t) => t.status === "in_progress"),
    review: projectTasks.filter((t) => t.status === "review"),
    done: projectTasks.filter((t) => t.status === "done"),
  };

  const completedCount = tasksByStatus.done.length;
  const totalCount = projectTasks.length;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Project header */}
      <div className="px-6 pt-5 pb-4">
        <div className="flex items-start gap-3">
          <span
            className="size-3 rounded-full mt-1.5 shrink-0"
            style={{ backgroundColor: project.color }}
          />
          <div className="min-w-0">
            <h1 className="text-[20px] font-semibold text-text-primary tracking-tight">
              {project.name}
            </h1>
            <p className="text-[13px] text-text-secondary mt-1 leading-relaxed">
              {project.description}
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-4">
          <ProgressBar completed={completedCount} total={totalCount} />
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-4 mt-4">
          {project.channel_ids.length > 0 && (
            <div className="flex items-center gap-1.5 text-[12px] text-text-tertiary">
              <MessageCircleIcon className="size-3.5" />
              {project.channel_ids.length} channel{project.channel_ids.length !== 1 ? "s" : ""}
            </div>
          )}
          {project.wiki_space_ids.length > 0 && (
            <div className="flex items-center gap-1.5 text-[12px] text-text-tertiary">
              <BookOpenIcon className="size-3.5" />
              {project.wiki_space_ids.length} wiki space{project.wiki_space_ids.length !== 1 ? "s" : ""}
            </div>
          )}
          {project.ticket_queue_ids.length > 0 && (
            <div className="flex items-center gap-1.5 text-[12px] text-text-tertiary">
              <TicketIcon className="size-3.5" />
              {project.ticket_queue_ids.length} queue{project.ticket_queue_ids.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-6 h-px bg-border-subtle" />

      {/* Tasks */}
      <div className="flex-1">
        {/* In progress */}
        {tasksByStatus.in_progress.length > 0 && (
          <div className="py-2">
            <div className="px-4 py-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                In progress
              </span>
            </div>
            {tasksByStatus.in_progress.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </div>
        )}

        {/* Todo */}
        {tasksByStatus.todo.length > 0 && (
          <div className="py-2">
            <div className="px-4 py-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                To do
              </span>
            </div>
            {tasksByStatus.todo.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </div>
        )}

        {/* Review */}
        {tasksByStatus.review.length > 0 && (
          <div className="py-2">
            <div className="px-4 py-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                In review
              </span>
            </div>
            {tasksByStatus.review.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </div>
        )}

        {/* Done */}
        {tasksByStatus.done.length > 0 && (
          <div className="py-2">
            <div className="px-4 py-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                Completed
              </span>
            </div>
            {tasksByStatus.done.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </div>
        )}
      </div>

      {/* Updates section */}
      {projectUpdates.length > 0 && (
        <>
          <div className="mx-6 h-px bg-border-subtle" />
          <div className="px-6 py-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary mb-3">
              Recent updates
            </h3>
            <div className="space-y-3">
              {projectUpdates.map((update) => (
                <div key={update.id} className="group">
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-md ${
                      update.type === "milestone"
                        ? "bg-success-muted text-success"
                        : update.type === "blocker"
                        ? "bg-error-muted text-error"
                        : "bg-surface-tertiary text-text-secondary"
                    }`}>
                      {update.type}
                    </span>
                    <span className="text-[11px] text-text-tertiary">
                      {new Date(update.created_at).toLocaleDateString("en", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <p className="text-[13px] font-medium text-text-primary mt-1">
                    {update.title}
                  </p>
                  <p className="text-[12px] text-text-secondary mt-0.5 leading-relaxed">
                    {update.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
