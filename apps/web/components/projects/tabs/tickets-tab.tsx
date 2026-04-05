"use client";

import { useState } from "react";
import {
  useProjectStore,
  type ProjectTicket,
  type TicketStatus,
  type TicketType,
} from "@/stores/project-store";
import { DetailPanel } from "@/components/layout/detail-panel";
import { FilterBar } from "@/components/ui/filter-bar";
import { CreateTicketDialog } from "@/components/projects/create-ticket-dialog";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import {
  CircleIcon,
  ClockIcon,
  CircleDotIcon,
  CheckCircle2Icon,
  XCircleIcon,
  TicketIcon,
  ArrowUpIcon,
  ArrowRightIcon,
  ArrowDownIcon,
  AlertCircleIcon,
  MessageSquareIcon,
  BugIcon,
  LightbulbIcon,
  HelpCircleIcon,
  UserIcon,
  MailIcon,
  Trash2Icon,
} from "lucide-react";

const statusConfig: Record<
  TicketStatus,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string }
> = {
  open: { label: "Open", icon: CircleIcon, color: "text-accent", bg: "bg-accent-muted" },
  pending: { label: "Pending", icon: ClockIcon, color: "text-warning", bg: "bg-warning-muted" },
  in_progress: { label: "In progress", icon: CircleDotIcon, color: "text-info", bg: "bg-info-muted" },
  resolved: { label: "Resolved", icon: CheckCircle2Icon, color: "text-success", bg: "bg-success-muted" },
  closed: { label: "Closed", icon: XCircleIcon, color: "text-text-tertiary", bg: "bg-surface-tertiary" },
};

const typeConfig: Record<
  TicketType,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  question: { label: "Question", icon: HelpCircleIcon, color: "text-info" },
  bug: { label: "Bug", icon: BugIcon, color: "text-error" },
  feature: { label: "Feature", icon: LightbulbIcon, color: "text-warning" },
  task: { label: "Task", icon: CircleDotIcon, color: "text-accent" },
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

interface TicketsTabProps {
  projectId: string;
}

export function TicketsTab({ projectId }: TicketsTabProps) {
  const { tickets, activeTicketId, setActiveTicket, detailPanelOpen, setDetailPanelOpen, updateTicket, setTickets } =
    useProjectStore();
  const { org, accessToken } = useAuth();
  const [statusFilter, setStatusFilter] = useState("all");

  const projectTickets = tickets.filter((t) => t.project_id === projectId);

  const filterTabs = [
    { value: "all", label: "All", count: projectTickets.length },
    {
      value: "open",
      label: "Open",
      count: projectTickets.filter(
        (t) => t.status !== "resolved" && t.status !== "closed"
      ).length,
    },
    {
      value: "resolved",
      label: "Resolved",
      count: projectTickets.filter((t) => t.status === "resolved").length,
    },
  ];

  const filtered =
    statusFilter === "all"
      ? projectTickets
      : statusFilter === "open"
      ? projectTickets.filter(
          (t) => t.status !== "resolved" && t.status !== "closed"
        )
      : projectTickets.filter((t) => t.status === statusFilter);

  const activeTicket = tickets.find((t) => t.id === activeTicketId);

  const handleUpdate = async (
    ticketId: string,
    updates: Partial<ProjectTicket>
  ) => {
    // Try API call if authenticated
    if (org?.id && accessToken) {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${org.id}/projects/${projectId}/tickets/${ticketId}`,
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
          console.error("Failed to update ticket");
        }
      } catch (error) {
        console.error("Error updating ticket:", error);
      }
    }
    // Always update local store
    updateTicket(ticketId, updates);
  };

  const handleDelete = async (ticketId: string) => {
    // Try API call if authenticated
    if (org?.id && accessToken) {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${org.id}/projects/${projectId}/tickets/${ticketId}`,
          {
            method: "DELETE",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
            },
          }
        );
        if (!response.ok) {
          console.error("Failed to delete ticket");
        }
      } catch (error) {
        console.error("Error deleting ticket:", error);
      }
    }
    // Remove from local store
    setTickets(tickets.filter((t) => t.id !== ticketId));
    setDetailPanelOpen(false);
    setActiveTicket(null);
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* List */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <FilterBar>
          <FilterBar.Tabs
            items={filterTabs}
            value={statusFilter}
            onChange={setStatusFilter}
          />
          <FilterBar.Actions>
            <CreateTicketDialog projectId={projectId} />
          </FilterBar.Actions>
        </FilterBar>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="size-10 rounded-xl bg-surface-secondary flex items-center justify-center mb-3">
                <TicketIcon className="size-4 text-text-tertiary" />
              </div>
              <p className="text-[13px] text-text-tertiary">No tickets found</p>
            </div>
          ) : (
            filtered.map((ticket) => {
              const status = statusConfig[ticket.status];
              const type = typeConfig[ticket.type];
              const StatusIcon = status.icon;
              const TypeIcon = type.icon;
              const isActive = activeTicketId === ticket.id;

              return (
                <button
                  key={ticket.id}
                  onClick={() => {
                    setActiveTicket(ticket.id);
                    setDetailPanelOpen(true);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-border-subtle",
                    isActive
                      ? "bg-accent-muted"
                      : "hover:bg-surface-secondary/60"
                  )}
                >
                  <StatusIcon className={cn("size-4 shrink-0", status.color)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-text-primary truncate">
                      {ticket.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <TypeIcon className={cn("size-3", type.color)} />
                      <span className="text-[11px] text-text-tertiary">
                        {ticket.requester_name}
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] text-text-tertiary shrink-0">
                    {new Date(ticket.created_at).toLocaleDateString("en", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
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
            setActiveTicket(null);
          }}
          title={activeTicket.title}
          width="w-[360px]"
        >
          <div className="px-5 py-3">
            {activeTicket.description && (
              <p className="text-[13px] text-text-secondary leading-relaxed mb-4">
                {activeTicket.description}
              </p>
            )}

            <div className="divide-y divide-border-subtle">
              <DetailRow label="Status">
                <select
                  className="h-7 rounded-md border border-border-subtle bg-surface-primary px-2 text-[12px] text-text-primary focus:outline-none"
                  value={activeTicket.status}
                  onChange={(e) =>
                    handleUpdate(activeTicket.id, {
                      status: e.target.value as TicketStatus,
                    })
                  }
                >
                  {Object.entries(statusConfig).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </DetailRow>

              <DetailRow label="Type">
                <select
                  className="h-7 rounded-md border border-border-subtle bg-surface-primary px-2 text-[12px] text-text-primary focus:outline-none"
                  value={activeTicket.type}
                  onChange={(e) =>
                    handleUpdate(activeTicket.id, {
                      type: e.target.value as TicketType,
                    })
                  }
                >
                  {Object.entries(typeConfig).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </DetailRow>

              <DetailRow label="Priority">
                <select
                  className="h-7 rounded-md border border-border-subtle bg-surface-primary px-2 text-[12px] text-text-primary focus:outline-none"
                  value={activeTicket.priority}
                  onChange={(e) =>
                    handleUpdate(activeTicket.id, {
                      priority: e.target.value as any,
                    })
                  }
                >
                  {Object.entries(priorityConfig).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </DetailRow>

              <DetailRow label="Requester">
                <div className="text-right">
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-text-primary">
                    <UserIcon className="size-3 text-text-tertiary" />
                    {activeTicket.requester_name}
                  </span>
                  <p className="text-[11px] text-text-tertiary mt-0.5">
                    {activeTicket.requester_email}
                  </p>
                </div>
              </DetailRow>

              <DetailRow label="Assignee">
                {activeTicket.assignee_id ? (
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
