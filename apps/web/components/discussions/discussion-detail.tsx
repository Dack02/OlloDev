"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  ThumbsUpIcon,
  CheckCircle2Icon,
  LockIcon,
  PinIcon,
  MessageSquareIcon,
  XCircleIcon,
  ArchiveIcon,
  RotateCcwIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDiscussionsStore } from "@/stores/discussions-store";
import { useAuth } from "@/lib/auth-context";
import { useOrgMembers } from "@/hooks/use-org-members";
import type { Discussion, DiscussionReply } from "@ollo-dev/shared/types";

const CATEGORY_CLASSES: Record<string, string> = {
  general: "bg-blue-100 text-blue-700 border-blue-200",
  ideas: "bg-purple-100 text-purple-700 border-purple-200",
  bugs: "bg-red-100 text-red-700 border-red-200",
  announcements: "bg-yellow-100 text-yellow-700 border-yellow-200",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface ReplyItemProps {
  reply: DiscussionReply;
  depth?: number;
  children?: DiscussionReply[];
  allReplies: DiscussionReply[];
  onMarkAccepted: (replyId: string) => void;
  submittingAccept: string | null;
  memberName: (id: string) => string;
}

function ReplyItem({
  reply,
  depth = 0,
  allReplies,
  onMarkAccepted,
  submittingAccept,
  memberName,
}: ReplyItemProps) {
  const t = useTranslations("discussions");
  const nested = allReplies.filter((r) => r.parent_id === reply.id);

  return (
    <div className={`flex flex-col gap-2 ${depth > 0 ? "ml-6 pl-3 border-l border-border-subtle" : ""}`}>
      <div
        className={`rounded-lg p-3 text-sm ${
          reply.is_accepted
            ? "bg-green-50 border border-green-200"
            : "bg-surface-secondary border border-border-subtle"
        }`}
      >
        {reply.is_accepted && (
          <div className="flex items-center gap-1 mb-1.5 text-green-700 text-xs font-medium">
            <CheckCircle2Icon className="size-3.5" />
            {t("accepted")}
          </div>
        )}
        <p className="text-text-primary whitespace-pre-wrap">{reply.body}</p>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3 text-xs text-text-secondary">
            <span className="font-medium text-text-primary">{memberName(reply.author_id)}</span>
            <span>{timeAgo(reply.created_at)}</span>
            <span className="flex items-center gap-1">
              <ThumbsUpIcon className="size-3" />
              {reply.upvotes}
            </span>
          </div>
          {!reply.is_accepted && (
            <button
              onClick={() => onMarkAccepted(reply.id)}
              disabled={submittingAccept === reply.id}
              className="text-xs text-text-secondary hover:text-green-700 transition-colors flex items-center gap-1"
            >
              <CheckCircle2Icon className="size-3.5" />
              {t("markAccepted")}
            </button>
          )}
        </div>
      </div>

      {nested.map((child) => (
        <ReplyItem
          key={child.id}
          reply={child}
          depth={depth + 1}
          allReplies={allReplies}
          onMarkAccepted={onMarkAccepted}
          submittingAccept={submittingAccept}
          memberName={memberName}
        />
      ))}
    </div>
  );
}

interface DiscussionDetailProps {
  discussionId: string;
}

export function DiscussionDetail({ discussionId }: DiscussionDetailProps) {
  const t = useTranslations("discussions");
  const { updateDiscussion } = useDiscussionsStore();
  const { org, accessToken } = useAuth();
  const orgId = org?.id;
  const members = useOrgMembers();
  const memberName = (id: string) => members.get(id)?.display_name ?? "Unknown";
  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [replies, setReplies] = useState<DiscussionReply[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [submittingAccept, setSubmittingAccept] = useState<string | null>(null);
  const [upvoting, setUpvoting] = useState(false);
  const [closeReason, setCloseReason] = useState("");
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const handleClose = async () => {
    if (!orgId || !accessToken || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/discussions/${discussionId}/close`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ reason: closeReason || undefined }),
        }
      );
      if (res.ok) {
        const json = await res.json();
        setDiscussion(json.data);
        updateDiscussion(discussionId, json.data);
        setShowCloseForm(false);
        setCloseReason("");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleReopen = async () => {
    if (!orgId || !accessToken || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/discussions/${discussionId}/reopen`,
        { method: "POST", headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (res.ok) {
        const json = await res.json();
        setDiscussion(json.data);
        updateDiscussion(discussionId, json.data);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!orgId || !accessToken || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/discussions/${discussionId}/archive`,
        { method: "POST", headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (res.ok) {
        const json = await res.json();
        setDiscussion(json.data);
        updateDiscussion(discussionId, json.data);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const fetchData = useCallback(async () => {
    if (!orgId || !accessToken) return;
    setLoading(true);
    setError(null);
    const headers = { Authorization: `Bearer ${accessToken}` };
    try {
      const base = process.env.NEXT_PUBLIC_API_URL;
      const [discRes, repliesRes] = await Promise.all([
        fetch(`${base}/api/v1/orgs/${orgId}/discussions/${discussionId}`, { headers }),
        fetch(`${base}/api/v1/orgs/${orgId}/discussions/${discussionId}/replies`, { headers }),
      ]);
      if (!discRes.ok) throw new Error("Failed to fetch discussion");
      const discJson = await discRes.json();
      setDiscussion(discJson.data ?? discJson);

      if (repliesRes.ok) {
        const repliesJson = await repliesRes.json();
        setReplies(repliesJson.data ?? repliesJson);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [discussionId, orgId, accessToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpvote = async () => {
    if (!discussion || upvoting) return;
    setUpvoting(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/discussions/${discussionId}/upvote`,
        { method: "POST", headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (res.ok) {
        const updated = { ...discussion, upvotes: discussion.upvotes + 1 };
        setDiscussion(updated);
        updateDiscussion(discussionId, { upvotes: updated.upvotes });
      }
    } finally {
      setUpvoting(false);
    }
  };

  const handlePostReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyBody.trim() || submittingReply) return;
    setSubmittingReply(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/discussions/${discussionId}/replies`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ body: replyBody }),
        }
      );
      if (res.ok) {
        setReplyBody("");
        await fetchData();
      }
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleMarkAccepted = async (replyId: string) => {
    setSubmittingAccept(replyId);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/discussions/${discussionId}/replies/${replyId}/accept`,
        { method: "POST", headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (res.ok) {
        await fetchData();
      }
    } finally {
      setSubmittingAccept(null);
    }
  };

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

  if (!discussion) return null;

  const topLevelReplies = replies.filter((r) => r.parent_id === null);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border-subtle bg-surface-primary shrink-0">
        <div className="flex items-start gap-2 mb-2">
          {discussion.is_pinned && (
            <PinIcon className="size-4 text-accent mt-0.5 shrink-0" />
          )}
          {discussion.is_locked && (
            <LockIcon className="size-4 text-text-secondary mt-0.5 shrink-0" />
          )}
          <h2 className="text-base font-semibold text-text-primary leading-snug">
            {discussion.title}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-3">
          {discussion.category && (
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                CATEGORY_CLASSES[discussion.category] ?? "bg-surface-secondary text-text-secondary border-border-subtle"
              }`}
            >
              {t(`categories.${discussion.category}` as Parameters<typeof t>[0])}
            </span>
          )}
          {discussion.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-surface-secondary px-2 py-0.5 text-xs text-text-secondary border border-border-subtle"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs text-text-secondary">
          <div className="flex items-center gap-3">
            <span className="font-medium text-text-primary">{memberName(discussion.author_id)}</span>
            <span>{timeAgo(discussion.created_at)}</span>
            <span className="flex items-center gap-1">
              <MessageSquareIcon className="size-3" />
              {discussion.reply_count}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={handleUpvote}
              disabled={upvoting}
              className="flex items-center gap-1.5 h-7 text-xs"
            >
              <ThumbsUpIcon className="size-3.5" />
              {t("upvote")} {discussion.upvotes > 0 && `(${discussion.upvotes})`}
            </Button>

            {discussion.status === "open" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowCloseForm(!showCloseForm)}
                disabled={actionLoading}
                className="flex items-center gap-1.5 h-7 text-xs"
              >
                <XCircleIcon className="size-3.5" />
                Close
              </Button>
            )}

            {discussion.status === "closed" && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleReopen}
                disabled={actionLoading}
                className="flex items-center gap-1.5 h-7 text-xs"
              >
                <RotateCcwIcon className="size-3.5" />
                Reopen
              </Button>
            )}

            {discussion.status !== "archived" && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleArchive}
                disabled={actionLoading}
                className="flex items-center gap-1.5 h-7 text-xs text-text-tertiary"
              >
                <ArchiveIcon className="size-3.5" />
                Archive
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Close form popover */}
      {showCloseForm && (
        <div className="px-5 py-3 border-b border-border-subtle bg-surface-secondary shrink-0">
          <div className="flex flex-col gap-2">
            <input
              type="text"
              className="w-full rounded-lg border border-border-subtle bg-surface-primary px-3 py-1.5 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent"
              placeholder="Reason for closing (optional)"
              value={closeReason}
              onChange={(e) => setCloseReason(e.target.value)}
            />
            <div className="flex items-center gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => setShowCloseForm(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleClose} disabled={actionLoading}>
                {actionLoading ? "Closing..." : "Close Discussion"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Status banners */}
      {discussion.status === "closed" && (
        <div className="px-5 py-2.5 border-b border-border-subtle bg-green-50 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle2Icon className="size-4" />
            <span>
              This discussion was closed
              {discussion.close_reason && ` \u2014 ${discussion.close_reason}`}
            </span>
          </div>
          <button
            onClick={handleReopen}
            disabled={actionLoading}
            className="text-xs font-medium text-green-700 hover:underline"
          >
            Reopen
          </button>
        </div>
      )}

      {discussion.status === "archived" && (
        <div className="px-5 py-2.5 border-b border-border-subtle bg-surface-tertiary shrink-0 flex items-center gap-2 text-sm text-text-tertiary">
          <ArchiveIcon className="size-4" />
          <span>This discussion is archived and read-only.</span>
        </div>
      )}

      {/* Body */}
      <div className="px-5 py-4 border-b border-border-subtle bg-surface-primary shrink-0">
        <p className="text-sm text-text-primary whitespace-pre-wrap">{discussion.body}</p>
      </div>

      {/* Replies */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
        {replies.length === 0 && (
          <p className="text-sm text-text-secondary text-center py-4">
            No replies yet. Be the first to reply!
          </p>
        )}
        {topLevelReplies.map((reply) => (
          <ReplyItem
            key={reply.id}
            reply={reply}
            allReplies={replies}
            onMarkAccepted={handleMarkAccepted}
            submittingAccept={submittingAccept}
            memberName={memberName}
          />
        ))}
      </div>

      {/* Reply form */}
      {!discussion.is_locked && discussion.status !== "closed" && discussion.status !== "archived" && (
        <div className="px-5 py-3 border-t border-border-subtle bg-surface-primary shrink-0">
          <form onSubmit={handlePostReply} className="flex flex-col gap-2">
            <textarea
              className="min-h-[80px] w-full rounded-lg border border-border-subtle bg-surface-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent resize-none"
              placeholder={t("writeReply")}
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              disabled={submittingReply}
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                disabled={submittingReply || !replyBody.trim()}
              >
                {t("postReply")}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
