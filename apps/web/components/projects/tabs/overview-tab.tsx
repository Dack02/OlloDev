"use client";

import { useProjectStore, type Project } from "@/stores/project-store";
import {
  BugIcon,
  TicketIcon,
  CodeIcon,
  FileIcon,
  MessageSquareIcon,
  TrendingUpIcon,
  AlertCircleIcon,
  CheckCircle2Icon,
  ClockIcon,
  ArrowUpIcon,
  CalendarDaysIcon,
  HeartPulseIcon,
  LinkIcon,
  TargetIcon,
  UserRoundIcon,
  FolderGit2Icon,
  GitPullRequestIcon,
  GitCommitIcon,
} from "lucide-react";
import { useDiscussionsStore } from "@/stores/discussions-store";

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
  const { tasks, bugs, tickets, files, updates, pullRequests, commits, githubRepos } = useProjectStore();
  const { discussions } = useDiscussionsStore();
  const hasGitHubRepo = githubRepos.some((r) => r.project_id === project.id);
  const openPrCount = pullRequests.filter((pr) => pr.state === "open").length;
  const latestCommit = commits.length > 0 ? commits[0] : null;

  const projectTasks = tasks.filter((t) => t.project_id === project.id);
  const projectBugs = bugs.filter((b) => b.project_id === project.id);
  const projectTickets = tickets.filter((t) => t.project_id === project.id);
  const projectFiles = files.filter((f) => f.project_id === project.id);
  const projectDiscussions = discussions.filter((d) => d.project_id === project.id);
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
  const detailItems = [
    { label: "Priority", value: project.priority.replace("_", " "), icon: ArrowUpIcon },
    { label: "Health", value: project.health.replace("_", " "), icon: HeartPulseIcon },
    { label: "Client / owner", value: project.client_name, icon: UserRoundIcon },
    { label: "Start date", value: project.start_date ? new Date(project.start_date).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" }) : null, icon: CalendarDaysIcon },
    { label: "Target date", value: project.target_date ? new Date(project.target_date).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" }) : null, icon: TargetIcon },
  ].filter((item) => item.value);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-6 py-5 space-y-6">
        {/* Description */}
        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <div className="space-y-4">
            <p className="text-[13px] text-text-secondary leading-relaxed max-w-2xl">
              {project.description || "No description yet."}
            </p>
            {project.key_outcome && (
              <div className="rounded-radius-md border border-border-subtle bg-surface-elevated p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                  Key outcome
                </p>
                <p className="mt-2 text-[13px] leading-relaxed text-text-primary">
                  {project.key_outcome}
                </p>
              </div>
            )}
          </div>

          <div className="rounded-radius-md border border-border-subtle bg-surface-elevated p-4">
            <h3 className="text-[12px] font-semibold uppercase tracking-wider text-text-tertiary">
              Project details
            </h3>
            <div className="mt-3 space-y-3">
              {detailItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-start gap-2.5">
                    <div className="mt-0.5 rounded-md bg-surface-tertiary p-1.5 text-text-secondary">
                      <Icon className="size-3.5" />
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-text-tertiary">
                        {item.label}
                      </p>
                      <p className="mt-0.5 text-[13px] text-text-primary capitalize">
                        {item.value}
                      </p>
                    </div>
                  </div>
                );
              })}
              {project.project_url && (
                <a
                  href={project.project_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start gap-2.5 text-accent hover:text-accent-hover"
                >
                  <div className="mt-0.5 rounded-md bg-accent-muted p-1.5">
                    <LinkIcon className="size-3.5" />
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-text-tertiary">
                      Project URL
                    </p>
                    <p className="mt-0.5 text-[13px] break-all">{project.project_url}</p>
                  </div>
                </a>
              )}
              {project.repository_url && (
                <a
                  href={project.repository_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start gap-2.5 text-accent hover:text-accent-hover"
                >
                  <div className="mt-0.5 rounded-md bg-surface-tertiary p-1.5 text-text-secondary">
                    <FolderGit2Icon className="size-3.5" />
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-text-tertiary">
                      Repository
                    </p>
                    <p className="mt-0.5 text-[13px] break-all">
                      {project.repository_url.replace(/^https?:\/\/(www\.)?github\.com\//, '')}
                    </p>
                  </div>
                </a>
              )}
            </div>
          </div>
        </div>

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
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
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
            label="Discussions"
            value={projectDiscussions.length}
            icon={MessageSquareIcon}
            color="bg-purple-500/10 text-purple-500"
          />
          <StatCard
            label="Files"
            value={projectFiles.length}
            icon={FileIcon}
            color="bg-info-muted text-info"
          />
          {hasGitHubRepo && (
            <StatCard
              label="Open PRs"
              value={openPrCount}
              icon={GitPullRequestIcon}
              color="bg-green-500/10 text-green-600"
            />
          )}
        </div>

        {/* Latest commit */}
        {latestCommit && (
          <a
            href={latestCommit.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 rounded-radius-md border border-border-subtle bg-surface-elevated hover:bg-surface-tertiary/40 transition-colors"
          >
            <div className="size-8 rounded-radius-sm flex items-center justify-center bg-surface-tertiary text-text-secondary shrink-0">
              <GitCommitIcon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                Latest commit
              </p>
              <p className="text-[13px] text-text-primary truncate mt-0.5">
                {latestCommit.message.split("\n")[0]}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-text-tertiary">{latestCommit.author_login}</span>
                <code className="text-[11px] text-text-tertiary font-mono">{latestCommit.sha.slice(0, 7)}</code>
              </div>
            </div>
          </a>
        )}

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
