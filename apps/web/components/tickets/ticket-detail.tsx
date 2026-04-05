"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TicketCommentForm } from "./ticket-comment-form";
import { useAuth } from "@/lib/auth-context";
import type { Ticket, TicketComment, TicketActivity } from "@ollo-dev/shared/types";

const STATUS_CLASSES: Record<string, string> = {
  open: "bg-blue-100 text-blue-700",
  pending: "bg-yellow-100 text-yellow-700",
  in_progress: "bg-accent/10 text-accent",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-600",
};

const PRIORITY_CLASSES: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  normal: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTimeRemaining(dueStr: string): { label: string; breached: boolean; warning: boolean } {
  const due = new Date(dueStr);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();

  if (diffMs < 0) {
    return { label: "Breached", breached: true, warning: false };
  }

  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  let label: string;
  if (diffDays > 0) label = `${diffDays}d`;
  else if (diffHours > 0) label = `${diffHours}h`;
  else label = `${diffMins}m`;

  return { label, breached: false, warning: diffHours < 2 };
}

interface TicketDetailProps {
  ticketId: string;
}

export function TicketDetail({ ticketId }: TicketDetailProps) {
  const t = useTranslations("tickets");
  const { org, accessToken } = useAuth();
  const orgId = org?.id;
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [activities, setActivities] = useState<TicketActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTicket = useCallback(async () => {
    if (!orgId || !accessToken) return;
    setLoading(true);
    setError(null);
    const headers = { Authorization: `Bearer ${accessToken}` };
    try {
      const [ticketRes, commentsRes, activitiesRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/tickets/${ticketId}`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/tickets/${ticketId}/comments`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/tickets/${ticketId}/activity`, { headers }),
      ]);

      if (!ticketRes.ok) throw new Error("Failed to fetch ticket");
      const ticketJson = await ticketRes.json();
      setTicket(ticketJson.data ?? ticketJson);

      if (commentsRes.ok) {
        const commentsJson = await commentsRes.json();
        setComments(commentsJson.data ?? commentsJson);
      }

      if (activitiesRes.ok) {
        const activitiesJson = await activitiesRes.json();
        setActivities(activitiesJson.data ?? activitiesJson);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [ticketId, orgId, accessToken]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-text-secondary text-sm">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-600 text-sm">
        {error}
      </div>
    );
  }

  if (!ticket) return null;

  const firstResponseSla = ticket.sla_breach_at
    ? formatTimeRemaining(ticket.sla_breach_at)
    : null;
  const resolutionSla = ticket.due_at
    ? formatTimeRemaining(ticket.due_at)
    : null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border-subtle bg-surface-primary">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-text-primary">
              {ticket.subject}
            </h2>
          </div>
          <div className="flex gap-1.5 shrink-0 mt-1">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[ticket.status] ?? ""}`}
            >
              {t(`status.${ticket.status}` as Parameters<typeof t>[0])}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_CLASSES[ticket.priority] ?? ""}`}
            >
              {t(`priority.${ticket.priority}` as Parameters<typeof t>[0])}
            </span>
          </div>
        </div>

        {/* Meta */}
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          <div className="text-text-secondary">
            <span className="font-medium text-text-primary">Requester: </span>
            {ticket.requester_id}
          </div>
          <div className="text-text-secondary">
            <span className="font-medium text-text-primary">Assignee: </span>
            {ticket.assignee_id ?? "Unassigned"}
          </div>
          <div className="text-text-secondary">
            <span className="font-medium text-text-primary">Type: </span>
            {ticket.type}
          </div>
          {ticket.queue_id && (
            <div className="text-text-secondary">
              <span className="font-medium text-text-primary">Queue: </span>
              {ticket.queue_id}
            </div>
          )}
          <div className="text-text-secondary">
            <span className="font-medium text-text-primary">Created: </span>
            {formatDate(ticket.created_at)}
          </div>
        </div>

        {/* Tags */}
        {ticket.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {ticket.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-surface-secondary px-2 py-0.5 text-xs text-text-secondary border border-border-subtle"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* SLA */}
        {(firstResponseSla || resolutionSla) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {ticket.sla_breach_at && new Date(ticket.sla_breach_at) < new Date() && (
              <span className="inline-flex items-center rounded-md bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                {t("slaBreached")}
              </span>
            )}
            {firstResponseSla && !firstResponseSla.breached && (
              <span
                className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                  firstResponseSla.warning
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-surface-secondary text-text-secondary"
                }`}
              >
                First response: {firstResponseSla.label}
              </span>
            )}
            {resolutionSla && !resolutionSla.breached && (
              <span
                className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                  resolutionSla.warning
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-surface-secondary text-text-secondary"
                }`}
              >
                Resolution: {resolutionSla.label}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Description */}
      <div className="px-4 py-3 border-b border-border-subtle bg-surface-primary">
        <p className="text-sm text-text-primary whitespace-pre-wrap">{ticket.description}</p>
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <Tabs defaultValue="comments" className="flex flex-col flex-1 overflow-hidden">
          <div className="px-4 pt-3 border-b border-border-subtle">
            <TabsList variant="line">
              <TabsTrigger value="comments">Comments ({comments.length})</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="comments" className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {comments.length === 0 && (
              <p className="text-sm text-text-secondary text-center py-4">No comments yet.</p>
            )}
            {comments.map((comment) => (
              <div
                key={comment.id}
                className={`rounded-lg p-3 text-sm ${
                  comment.is_internal
                    ? "bg-yellow-50 border border-yellow-200"
                    : "bg-surface-secondary border border-border-subtle"
                }`}
              >
                {comment.is_internal && (
                  <span className="text-xs font-medium text-yellow-700 mb-1 block">
                    Internal Note
                  </span>
                )}
                <p className="text-text-primary whitespace-pre-wrap">{comment.body}</p>
                <p className="text-xs text-text-secondary mt-1.5">
                  {comment.author_id} · {formatDate(comment.created_at)}
                </p>
              </div>
            ))}

            {/* Comment form */}
            <div className="mt-auto pt-3 border-t border-border-subtle">
              <TicketCommentForm
                ticketId={ticketId}
                onCommentAdded={fetchTicket}
                showInternalToggle={true}
              />
            </div>
          </TabsContent>

          <TabsContent value="activity" className="flex-1 overflow-y-auto p-4">
            {activities.length === 0 && (
              <p className="text-sm text-text-secondary text-center py-4">No activity yet.</p>
            )}
            <div className="flex flex-col gap-2">
              {activities.map((activity) => (
                <div key={activity.id} className="flex gap-2 text-sm">
                  <div className="mt-1 h-1.5 w-1.5 rounded-full bg-border-subtle shrink-0" />
                  <div>
                    <span className="text-text-primary font-medium">{activity.actor_id}</span>{" "}
                    <span className="text-text-secondary">{activity.action}</span>
                    {activity.old_value && activity.new_value && (
                      <span className="text-text-secondary">
                        {" "}
                        from <span className="font-medium">{activity.old_value}</span> to{" "}
                        <span className="font-medium">{activity.new_value}</span>
                      </span>
                    )}
                    <p className="text-xs text-text-secondary mt-0.5">
                      {formatDate(activity.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
