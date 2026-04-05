"use client";

import { useEffect } from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useProjectStore } from "@/stores/project-store";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { EditProjectDialog } from "@/components/projects/edit-project-dialog";
import { DeleteProjectDialog } from "@/components/projects/delete-project-dialog";
import { Button } from "@/components/ui/button";
import {
  FolderIcon,
  LayoutDashboardIcon,
  BugIcon,
  CodeIcon,
  TicketIcon,
  FileIcon,
  MessageCircleIcon,
  MessageSquareIcon,
  StickyNoteIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";

const tabs = [
  { id: "overview", label: "Overview", icon: LayoutDashboardIcon, segment: "" },
  { id: "bugs", label: "Bugs", icon: BugIcon, segment: "/bugs" },
  { id: "dev", label: "Dev", icon: CodeIcon, segment: "/dev" },
  { id: "tickets", label: "Tickets", icon: TicketIcon, segment: "/tickets" },
  { id: "discussions", label: "Discussions", icon: MessageSquareIcon, segment: "/discussions" },
  { id: "notes", label: "Notes", icon: StickyNoteIcon, segment: "/notes" },
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
  const { projects, addProject, updateProject, setActiveProject, setTasks, setBugs, setTickets, setFiles, setNotes, bugs, tickets, getUnreadCount } = useProjectStore();
  const { org, accessToken, loading } = useAuth();
  const orgId = org?.id;

  useEffect(() => {
    setActiveProject(projectId);
    return () => setActiveProject(null);
  }, [projectId, setActiveProject]);

  // Fetch all sub-resources when entering a project
  useEffect(() => {
    if (loading || !orgId || !accessToken) return;
    const base = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/projects/${projectId}`;
    const headers = { Authorization: `Bearer ${accessToken}` };

    Promise.all([
      fetch(`${base}/tasks?limit=100`, { headers }).then((r) => {
        if (!r.ok) throw new Error(`tasks: ${r.status}`);
        return r.json();
      }),
      fetch(`${base}/bugs?limit=100`, { headers }).then((r) => {
        if (!r.ok) throw new Error(`bugs: ${r.status}`);
        return r.json();
      }),
      fetch(`${base}/tickets?limit=100`, { headers }).then((r) => {
        if (!r.ok) throw new Error(`tickets: ${r.status}`);
        return r.json();
      }),
      fetch(`${base}/files?limit=100`, { headers }).then((r) => {
        if (!r.ok) throw new Error(`files: ${r.status}`);
        return r.json();
      }),
      fetch(`${base}/notes?limit=100`, { headers }).then((r) => {
        if (!r.ok) throw new Error(`notes: ${r.status}`);
        return r.json();
      }),
    ]).then(([tasks, bugs, tickets, files, notes]) => {
      if (tasks?.data) setTasks(tasks.data);
      if (bugs?.data) setBugs(bugs.data);
      if (tickets?.data) setTickets(tickets.data);
      if (files?.data) setFiles(files.data);
      if (notes?.data) setNotes(notes.data);
    }).catch((err) => console.error("[ProjectLayout]", err));
  }, [loading, orgId, accessToken, projectId, setTasks, setBugs, setTickets, setFiles, setNotes]);

  const project = projects.find((p) => p.id === projectId);

  useEffect(() => {
    if (loading || !orgId || !accessToken || project) return;

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/projects/${projectId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`project: ${r.status}`);
        return r.json();
      })
      .then((json) => {
        if (!json?.data) return;
        if (projects.some((candidate) => candidate.id === projectId)) {
          updateProject(projectId, json.data);
          return;
        }
        addProject({
          ...json.data,
          channel_ids: [],
          wiki_space_ids: [],
          ticket_queue_ids: [],
          discussion_ids: [],
          task_count: json.data.task_count ?? 0,
          completed_task_count: json.data.completed_task_count ?? 0,
        });
      })
      .catch((err) => console.error("[ProjectLayout] project fetch error", err));
  }, [loading, orgId, accessToken, project, projectId, projects, addProject, updateProject]);

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
          <div className="ml-auto flex items-center gap-2">
            <EditProjectDialog
              project={project}
              trigger={
                <Button variant="outline" size="sm">
                  <PencilIcon className="size-3.5" />
                  Edit
                </Button>
              }
            />
            <DeleteProjectDialog
              project={project}
              redirectToProjects
              trigger={
                <Button variant="destructive" size="sm">
                  <Trash2Icon className="size-3.5" />
                  Delete
                </Button>
              }
            />
          </div>
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
