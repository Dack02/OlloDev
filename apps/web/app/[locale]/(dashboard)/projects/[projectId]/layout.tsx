"use client";

import { useEffect } from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useProjectStore } from "@/stores/project-store";
import { cn } from "@/lib/utils";
import {
  FolderIcon,
  LayoutDashboardIcon,
  BugIcon,
  CodeIcon,
  TicketIcon,
  FileIcon,
  MessageCircleIcon,
} from "lucide-react";

const tabs = [
  { id: "overview", label: "Overview", icon: LayoutDashboardIcon, segment: "" },
  { id: "bugs", label: "Bugs", icon: BugIcon, segment: "/bugs" },
  { id: "dev", label: "Dev", icon: CodeIcon, segment: "/dev" },
  { id: "tickets", label: "Tickets", icon: TicketIcon, segment: "/tickets" },
  { id: "files", label: "Files", icon: FileIcon, segment: "/files" },
  { id: "chat", label: "Chat & Threads", icon: MessageCircleIcon, segment: "/chat" },
] as const;

export default function ProjectDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const locale = useLocale();
  const projectId = params.projectId as string;
  const { projects, setActiveProject, bugs, tickets, getUnreadCount } = useProjectStore();

  useEffect(() => {
    setActiveProject(projectId);
    return () => setActiveProject(null);
  }, [projectId, setActiveProject]);

  const project = projects.find((p) => p.id === projectId);

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="size-12 rounded-xl bg-surface-secondary flex items-center justify-center mx-auto mb-3">
            <FolderIcon className="size-5 text-text-tertiary" />
          </div>
          <p className="text-[14px] text-text-secondary">Project not found</p>
        </div>
      </div>
    );
  }

  const basePath = `/${locale}/projects/${projectId}`;

  // Determine active tab from pathname
  const activeSegment = pathname.replace(basePath, "") || "";

  // Counts for tab badges
  const openBugs = bugs.filter(
    (b) => b.project_id === projectId && b.status !== "fixed" && b.status !== "closed"
  ).length;
  const openTickets = tickets.filter(
    (t) => t.project_id === projectId && t.status !== "resolved" && t.status !== "closed"
  ).length;

  const unreadMessages = getUnreadCount(projectId);

  function getCount(tabId: string): number | undefined {
    if (tabId === "bugs" && openBugs > 0) return openBugs;
    if (tabId === "tickets" && openTickets > 0) return openTickets;
    if (tabId === "chat" && unreadMessages > 0) return unreadMessages;
    return undefined;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Project header */}
      <div className="px-6 pt-5 pb-0 shrink-0">
        <div className="flex items-center gap-3">
          <span
            className="size-3 rounded-full shrink-0"
            style={{ backgroundColor: project.color }}
          />
          <h1 className="text-[20px] font-semibold text-text-primary tracking-tight">
            {project.name}
          </h1>
          <span
            className={cn(
              "text-[11px] font-medium px-1.5 py-0.5 rounded-md",
              project.status === "active"
                ? "bg-accent-muted text-accent"
                : project.status === "completed"
                ? "bg-success-muted text-success"
                : project.status === "paused"
                ? "bg-warning-muted text-warning"
                : "bg-surface-tertiary text-text-secondary"
            )}
          >
            {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
          </span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-0.5 px-4 mt-3 border-b border-border-subtle shrink-0">
        {tabs.map((tab) => {
          const isActive = activeSegment === tab.segment;
          const Icon = tab.icon;
          const count = getCount(tab.id);

          return (
            <Link
              key={tab.id}
              href={`${basePath}${tab.segment}`}
              className={cn(
                "group relative flex items-center gap-1.5 px-3 py-2.5 text-[13px] font-medium transition-colors duration-150",
                isActive
                  ? "text-text-primary"
                  : "text-text-tertiary hover:text-text-secondary"
              )}
            >
              <Icon className={cn("size-3.5", isActive ? "text-text-primary" : "text-text-tertiary group-hover:text-text-secondary")} />
              {tab.label}

              {count !== undefined && (
                <span
                  className={cn(
                    "text-[11px] font-medium tabular-nums min-w-[18px] text-center rounded-full px-1.5 py-px transition-colors duration-150",
                    isActive
                      ? "bg-text-primary/[0.07] text-text-primary"
                      : "bg-surface-tertiary/60 text-text-tertiary"
                  )}
                >
                  {count}
                </span>
              )}

              {/* Active underline */}
              <span
                className={cn(
                  "absolute bottom-0 left-3 right-3 h-[2px] rounded-full transition-all duration-200",
                  isActive ? "bg-text-primary" : "bg-transparent"
                )}
              />
            </Link>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
