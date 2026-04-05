"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useDiscussionsStore,
  type StatusFilter,
} from "@/stores/discussions-store";
import { DetailPanel } from "@/components/layout/detail-panel";
import { FilterBar } from "@/components/ui/filter-bar";
import { CreateTicketDialog } from "@/components/projects/create-ticket-dialog";
import { useAuth } from "@/lib/auth-context";
import { useOrgMembers } from "@/hooks/use-org-members";
import { useProjectStore } from "@/stores/project-store";
import { cn } from "@/lib/utils";
import { notify } from "@/lib/notify";
import type { Discussion } from "@ollo-dev/shared/types";
import {
  CircleIcon,
  CheckCircle2Icon,
  ArchiveIcon,
  TicketIcon,
  ArrowUpIcon,
  ArrowRightIcon,
  ArrowDownIcon,
  AlertCircleIcon,
  HelpCircleIcon,
  BugIcon,
  LightbulbIcon,
  MessageSquareIcon,
  UserIcon,
  Trash2Icon,
} from "lucide-react";

const statusConfig = {
  open: { label: "Open", icon: CircleIcon, color: "text-accent", bg: "bg-accent-muted" },
  closed: { label: "Closed", icon: CheckCircle2Icon, color: "text-success", bg: "bg-success-muted" },
  archived: { label: "Archived", icon: ArchiveIcon, color: "text-text-tertiary", bg: "bg-surface-tertiary" },
} as const;

const priorityConfig = {
  low: { label: "Low", icon: ArrowDownIcon, color: "text-text-tertiary" },
  medium: { label: "Medium", icon: ArrowRightIcon, color: "text-info" },
  high: { label: "High", icon: ArrowUpIcon, color: "text-warning" },
  urgent: { label: "Urgent", icon: AlertCircleIcon, color: "text-error" },
} as const;

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  question: HelpCircleIcon,
  bug: BugIcon,
  feature: LightbulbIcon,
  task: TicketIcon,
};

function getTicketType(discussion: Discussion): string {
  const knownTypes = ["question", "bug", "feature", "task"];
  return discussion.tags.find((t) => knownTypes.includes(t)) ?? "task";
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2.5">
      <span className="text-[12px] text-text-tertiary">{label}</span>
      <div className="text-right">{children}</div>
    </div>
  );
}

interface TicketsTabProps {
  projectId: string;
}

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
];

export function TicketsTab({ projectId }: TicketsTabProps) {
  const {
    discussions,
    activeDiscussionId,
    setActiveDiscussion,
    setDiscussions,
    mergeDiscussions,
    updateDiscussion,
  } = useDiscussionsStore();
  const { detailPanelOpen, setDetailPanelOpen } = useProjectStore();
  const { org, accessToken } = useAuth();
  const orgId = org?.id;
  const members = useOrgMembers();
  const params = useParams();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!orgId || !accessToken) return;

    const fetchTicketDiscussions = async () => {
      setLoading(true);
      try {
        const url = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/discussions?category=tickets&project_id=${projectId}&include_archived=true`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) throw new Error("Failed to fetch tickets");
        const json = await res.json();
        mergeDiscussions(json.data ?? json);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    fetchTicketDiscussions();
  }, [orgId, accessToken, projectId, mergeDiscussions]);

  const tickets = discussions.filter(
    (d) => d.category === "tickets" && d.project_id === projectId
  );

  let filtered = tickets;
  if (statusFilter === "all") {
    filtered = tickets.filter((d) => d.status !== "archived");
  } else {
    filtered = tickets.filter((d) => d.status === statusFilter);
  }

  const statusTabItems = STATUS_TABS.map((tab) => ({
    value: tab.value,
    label: tab.label,
    count:
      tab.value === "all"
        ? tickets.filter((d) => d.status !== "archived").length
        : tickets.filter((d) => d.status === tab.value).length,
  }));

  const activeTicket = activeDiscussionId
    ? tickets.find((d) => d.id === activeDiscussionId)
    : null;

  const handleUpdate = async (ticketId: string, updates: Partial<Discussion>) => {
    updateDiscussion(ticketId, updates);
    if (orgId && accessToken) {
      try {
        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/discussions/${ticketId}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updates),
          }
        );
      } catch {
        notify.error("Update failed", "Could not update ticket");
      }
    }
  };

  const handleDelete = async (ticketId: string) => {
    if (orgId && accessToken) {
      try {
        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/discussions/${ticketId}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
      } catch {
        notify.error("Delete failed", "Could not delete ticket");
      }
    }
    setDiscussions(discussions.filter((d) => d.id !== ticketId));
    setDetailPanelOpen(false);
    setActiveDiscussion(null);
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* List */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <FilterBar>
          <FilterBar.Tabs
            items={statusTabItems}
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as StatusFilter)}
          />
          <FilterBar.Actions>
            <CreateTicketDialog projectId={projectId} />
          </FilterBar.Actions>
        </FilterBar>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="p-6 text-center text-text-tertiary text-[13px]">Loading...</div>
          )}
          {!loading && filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="size-10 rounded-xl bg-surface-secondary flex items-center justify-center mb-3">
                <TicketIcon className="size-4 text-text-tertiary" />
              </div>
              <p className="text-[13px] text-text-tertiary">No tickets found</p>
            </div>
          ) : (
            !loading &&
            filtered.map((ticket) => {
              const status = statusConfig[ticket.status as keyof typeof statusConfig] ?? statusConfig.open;
              const StatusIcon = status.icon;
              const ticketType = getTicketType(ticket);
              const TypeIcon = typeIcons[ticketType] ?? TicketIcon;
              const isActive = activeDiscussionId === ticket.id;

              return (
                <button
                  key={ticket.id}
                  onClick={() => {
                    setActiveDiscussion(ticket.id);
                    setDetailPanelOpen(true);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-border-subtle",
                    isActive ? "bg-accent-muted" : "hover:bg-surface-secondary/60"
                  )}
                >
                  <StatusIcon className={cn("size-4 shrink-0", status.color)} />
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-[13px] truncate",
                      ticket.status === "closed" ? "text-text-tertiary line-through" : "text-text-primary"
                    )}>
                      {ticket.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <TypeIcon className="size-3 text-text-tertiary" />
                      <span className="text-[11px] text-text-tertiary capitalize">{ticketType}</span>
                      {ticket.requester_name && (
                        <span className="text-[11px] text-text-tertiary">{ticket.requester_name}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {ticket.reply_count > 0 && (
                      <span className="flex items-center gap-1 text-[11px] text-text-tertiary">
                        <MessageSquareIcon className="size-3" />
                        {ticket.reply_count}
                      </span>
                    )}
                    <span className="text-[11px] text-text-tertiary">
                      {new Date(ticket.created_at).toLocaleDateString("en", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Detail panel */}
      {activeTicket && (
        <DetailPanel
          open={detailPanelOpen}
          onClose={() => {
            setDetailPanelOpen(false);
            setActiveDiscussion(null);
          }}
          title={activeTicket.title}
          width="w-[360px]"
        >
          <div className="px-5 py-3">
            {activeTicket.body && (
              <p className="text-[13px] text-text-secondary leading-relaxed mb-4">
                {activeTicket.body}
              </p>
            )}

            <div className="divide-y divide-border-subtle">
              <DetailRow label="Status">
                <span className={cn(
                  "inline-flex items-center gap-1.5 text-[12px] font-medium px-2 py-0.5 rounded-md",
                  statusConfig[activeTicket.status as keyof typeof statusConfig]?.bg ?? "bg-surface-tertiary",
                  statusConfig[activeTicket.status as keyof typeof statusConfig]?.color ?? "text-text-tertiary"
                )}>
                  {statusConfig[activeTicket.status as keyof typeof statusConfig]?.label ?? activeTicket.status}
                </span>
              </DetailRow>

              <DetailRow label="Type">
                <span className="inline-flex items-center gap-1 text-[12px] text-text-primary capitalize">
                  {(() => {
                    const t = getTicketType(activeTicket);
                    const Icon = typeIcons[t] ?? TicketIcon;
                    return <><Icon className="size-3 text-text-tertiary" />{t}</>;
                  })()}
                </span>
              </DetailRow>

              {activeTicket.priority && (
                <DetailRow label="Priority">
                  {(() => {
                    const p = priorityConfig[activeTicket.priority as keyof typeof priorityConfig];
                    if (!p) return <span className="text-[12px]">{activeTicket.priority}</span>;
                    const PIcon = p.icon;
                    return (
                      <span className={cn("inline-flex items-center gap-1 text-[12px] font-medium", p.color)}>
                        <PIcon className="size-3" />
                        {p.label}
                      </span>
                    );
                  })()}
                </DetailRow>
              )}

              {(activeTicket.requester_name || activeTicket.requester_email) && (
                <DetailRow label="Requester">
                  <div className="text-right">
                    {activeTicket.requester_name && (
                      <span className="inline-flex items-center gap-1.5 text-[12px] text-text-primary">
                        <UserIcon className="size-3 text-text-tertiary" />
                        {activeTicket.requester_name}
                      </span>
                    )}
                    {activeTicket.requester_email && (
                      <p className="text-[11px] text-text-tertiary mt-0.5">
                        {activeTicket.requester_email}
                      </p>
                    )}
                  </div>
                </DetailRow>
              )}

              <DetailRow label="Assignee">
                {activeTicket.assignee_id ? (() => {
                  const member = members.get(activeTicket.assignee_id!);
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

              <DetailRow label="Replies">
                <Link
                  href={`/${params.locale}/projects/${projectId}/discussions?id=${activeTicket.id}`}
                  className="inline-flex items-center gap-1.5 text-[12px] font-medium text-accent hover:underline"
                >
                  <MessageSquareIcon className="size-3" />
                  {activeTicket.reply_count} {activeTicket.reply_count === 1 ? "reply" : "replies"}
                </Link>
              </DetailRow>

              <DetailRow label="Created">
                <span className="text-[12px] text-text-secondary">
                  {new Date(activeTicket.created_at).toLocaleDateString("en", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </DetailRow>
            </div>

            <div className="mt-6 pt-4 border-t border-border-subtle">
              <button
                onClick={() => handleDelete(activeTicket.id)}
                className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-error hover:bg-error-muted rounded-md transition-colors"
              >
                <Trash2Icon className="size-4" />
                Delete ticket
              </button>
            </div>
          </div>
        </DetailPanel>
      )}
    </div>
  );
}
