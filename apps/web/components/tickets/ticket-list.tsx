"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { FilterBar } from "@/components/ui/filter-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useTicketStore } from "@/stores/ticket-store";
import { useAuth } from "@/lib/auth-context";
import type { Ticket } from "@ollo-dev/shared/types";

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function TicketList() {
  const t = useTranslations("tickets");
  const { tickets, activeTicketId, filters, setTickets, setActiveTicket, setFilters } =
    useTicketStore();
  const { org, accessToken } = useAuth();
  const orgId = org?.id;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId || !accessToken) return;

    const fetchTickets = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (filters.status) params.set("status", filters.status);
        if (filters.priority) params.set("priority", filters.priority);
        if (filters.assignee_id) params.set("assignee_id", filters.assignee_id);

        const url = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/tickets${params.toString() ? `?${params}` : ""}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) throw new Error("Failed to fetch tickets");
        const json = await res.json();
        setTickets(json.data ?? json);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, [orgId, accessToken, filters, setTickets]);

  const [viewTab, setViewTab] = useState("all");

  const viewTabs = [
    { value: "all", label: "All tickets" },
    { value: "mine", label: "Assigned to me" },
    { value: "unassigned", label: "Unassigned" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar — tabs left, dropdowns right */}
      <FilterBar>
        <FilterBar.Tabs
          items={viewTabs}
          value={viewTab}
          onChange={setViewTab}
        />
        <FilterBar.Actions>
          <FilterBar.Select
            items={STATUS_OPTIONS}
            value={filters.status ?? ""}
            onChange={(v) => setFilters({ status: v || undefined })}
            placeholder="Status"
          />
          <FilterBar.Select
            items={PRIORITY_OPTIONS}
            value={filters.priority ?? ""}
            onChange={(v) => setFilters({ priority: v || undefined })}
            placeholder="Priority"
          />
        </FilterBar.Actions>
      </FilterBar>

      {/* Ticket table */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="p-6 text-center text-text-tertiary text-[13px]">Loading...</div>
        )}
        {error && (
          <div className="p-6 text-center text-[13px] text-error">{error}</div>
        )}
        {!loading && !error && tickets.length === 0 && (
          <div className="p-6 text-center text-text-tertiary text-[13px]">
            {t("noTickets")}
          </div>
        )}
        {!loading && !error && tickets.length > 0 && (
          <table className="w-full">
            <thead className="sticky top-0 bg-surface-secondary/80 backdrop-blur-sm border-b border-border-subtle">
              <tr>
                <th className="text-left px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Subject</th>
                <th className="text-left px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary w-28">Status</th>
                <th className="text-left px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary w-24">Priority</th>
                <th className="text-left px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary w-28">Assignee</th>
                <th className="text-left px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary w-24">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {tickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  onClick={() => setActiveTicket(ticket.id)}
                  className={`cursor-pointer transition-colors duration-100 ${
                    activeTicketId === ticket.id
                      ? "bg-accent-muted"
                      : "hover:bg-surface-secondary/50"
                  }`}
                >
                  <td className="px-4 py-2.5 text-[13px] text-text-primary font-medium truncate max-w-xs">
                    {ticket.subject}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge
                      kind="status"
                      value={ticket.status as "open" | "pending" | "in_progress" | "resolved" | "closed"}
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge
                      kind="priority"
                      value={ticket.priority as "low" | "normal" | "high" | "urgent"}
                    />
                  </td>
                  <td className="px-4 py-2.5 text-[12px] text-text-secondary truncate">
                    {ticket.assignee_id ?? (
                      <span className="text-text-tertiary">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-[12px] text-text-tertiary">
                    {formatDate(ticket.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
