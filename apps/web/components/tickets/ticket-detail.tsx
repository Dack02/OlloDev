"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAuth } from "@/lib/auth-context";
import { useProjectStore } from "@/stores/project-store";
import { useOrgMembers } from "@/hooks/use-org-members";
import type { Discussion, DiscussionReply } from "@ollo-dev/shared/types";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface TicketDetailProps {
  ticketId: string;
}

export function TicketDetail({ ticketId }: TicketDetailProps) {
  const { org, accessToken } = useAuth();
  const orgId = org?.id;
  const { projects } = useProjectStore();
  const members = useOrgMembers();
  const projectName = (id: string | null) => id ? projects.find((p) => p.id === id)?.name ?? id : null;
  const memberName = (id: string | null) => id ? members.get(id)?.display_name ?? "Unknown" : null;
  const [ticket, setTicket] = useState<Discussion | null>(null);
  const [replies, setReplies] = useState<DiscussionReply[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  const fetchTicket = useCallback(async () => {
    if (!orgId || !accessToken) return;

    setLoading(true);
    setError(null);

    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      const [ticketRes, repliesRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/discussions/${ticketId}`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/discussions/${ticketId}/replies`, { headers }),
      ]);

      if (!ticketRes.ok) throw new Error("Failed to fetch ticket");

      const ticketJson = await ticketRes.json();
      setTicket(ticketJson.data ?? ticketJson);

      if (repliesRes.ok) {
        const repliesJson = await repliesRes.json();
        setReplies(repliesJson.data ?? repliesJson);
      } else {
        setReplies([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [accessToken, orgId, ticketId]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  const handlePostReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyBody.trim() || !orgId || !accessToken || submittingReply) return;

    setSubmittingReply(true);
    setError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/discussions/${ticketId}/replies`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ body: replyBody }),
        }
      );

      if (!res.ok) throw new Error("Failed to add reply");

      setReplyBody("");
      await fetchTicket();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSubmittingReply(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-text-secondary">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-red-600">
        {error}
      </div>
    );
  }

  if (!ticket) return null;

  const ticketType = ticket.tags.find((tag) =>
    ["question", "bug", "feature", "task"].includes(tag)
  ) ?? "task";

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-border-subtle bg-surface-primary p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-text-primary">{ticket.title}</h2>
            <p className="mt-1 text-sm capitalize text-text-secondary">{ticketType}</p>
          </div>
          <div className="mt-1 flex gap-1.5">
            <StatusBadge kind="status" value={ticket.status as "open" | "closed" | "archived"} />
            {ticket.priority && (
              <StatusBadge
                kind="priority"
                value={ticket.priority as "low" | "medium" | "high" | "urgent"}
              />
            )}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          <div className="text-text-secondary">
            <span className="font-medium text-text-primary">Requester: </span>
            {ticket.requester_name ?? ticket.requester_email ?? "Not set"}
          </div>
          <div className="text-text-secondary">
            <span className="font-medium text-text-primary">Assignee: </span>
            {memberName(ticket.assignee_id) ?? "Unassigned"}
          </div>
          <div className="text-text-secondary">
            <span className="font-medium text-text-primary">Created: </span>
            {formatDate(ticket.created_at)}
          </div>
          {ticket.project_id && (
            <div className="text-text-secondary">
              <span className="font-medium text-text-primary">Project: </span>
              {projectName(ticket.project_id)}
            </div>
          )}
        </div>

        <div className="mt-4 whitespace-pre-wrap text-sm text-text-primary">{ticket.body}</div>

        {ticket.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {ticket.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-border-subtle bg-surface-secondary px-2 py-0.5 text-xs text-text-secondary"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {replies.length === 0 && (
            <div className="text-sm text-text-secondary">No replies yet.</div>
          )}

          {replies.map((reply) => (
            <div
              key={reply.id}
              className="rounded-lg border border-border-subtle bg-surface-secondary p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-text-secondary">{memberName(reply.author_id) ?? "Unknown"}</div>
                <div className="text-[11px] text-text-tertiary">{formatDate(reply.created_at)}</div>
              </div>
              <div className="mt-2 whitespace-pre-wrap text-sm text-text-primary">
                {reply.body}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handlePostReply} className="mt-4 flex flex-col gap-2 border-t border-border-subtle pt-4">
          <textarea
            className="min-h-[88px] w-full resize-none rounded-lg border border-border-subtle bg-surface-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none"
            placeholder="Add a reply"
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            disabled={submittingReply}
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={submittingReply || !replyBody.trim()}>
              {submittingReply ? "Posting..." : "Post reply"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
