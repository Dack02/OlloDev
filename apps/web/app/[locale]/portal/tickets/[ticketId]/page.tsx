"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TicketCommentForm } from "@/components/tickets/ticket-comment-form";
import { useAuth } from "@/lib/auth-context";
import type { Ticket, TicketComment } from "@ollo-dev/shared/types";

const STATUS_CLASSES: Record<string, string> = {
  open: "bg-blue-100 text-blue-700",
  pending: "bg-yellow-100 text-yellow-700",
  in_progress: "bg-purple-100 text-purple-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-600",
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

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className={`text-2xl transition-colors ${
            star <= value ? "text-yellow-400" : "text-gray-300 hover:text-yellow-300"
          }`}
          aria-label={`${star} star`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

interface PortalTicketPageProps {
  params: Promise<{ ticketId: string }>;
}

export default function PortalTicketDetailPage({ params: paramsPromise }: PortalTicketPageProps) {
  const params = use(paramsPromise);
  const t = useTranslations("tickets");
  const tPortal = useTranslations("portal");
  const { org, accessToken } = useAuth();
  const orgId = org?.id;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Satisfaction rating
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!orgId || !accessToken) return;
    setLoading(true);
    setError(null);
    const headers = { Authorization: `Bearer ${accessToken}` };
    try {
      const [ticketRes, commentsRes] = await Promise.all([
        fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/tickets/${params.ticketId}`,
          { headers }
        ),
        fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/tickets/${params.ticketId}/comments`,
          { headers }
        ),
      ]);

      if (!ticketRes.ok) throw new Error("Failed to fetch ticket");
      const ticketJson = await ticketRes.json();
      const fetchedTicket: Ticket = ticketJson.data ?? ticketJson;
      setTicket(fetchedTicket);
      if (fetchedTicket.satisfaction_rating) {
        setRating(fetchedTicket.satisfaction_rating);
        setRatingSubmitted(true);
      }

      if (commentsRes.ok) {
        const commentsJson = await commentsRes.json();
        const allComments: TicketComment[] = commentsJson.data ?? commentsJson;
        // Only show public comments in portal
        setComments(allComments.filter((c) => !c.is_internal));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [params.ticketId, orgId, accessToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRatingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) return;
    setRatingSubmitting(true);
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/tickets/${params.ticketId}/rating`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ rating, comment: ratingComment }),
        }
      );
      setRatingSubmitted(true);
    } finally {
      setRatingSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500 text-sm">Loading...</div>;
  }

  if (error || !ticket) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 text-sm">{error ?? "Ticket not found."}</p>
        <Link href="../tickets" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
          {tPortal("backToTickets")}
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Back link */}
      <Link
        href="../tickets"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        ← {tPortal("backToTickets")}
      </Link>

      {/* Ticket header */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 mb-4">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{ticket.subject}</h1>
          </div>
          <span
            className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-sm font-medium ${STATUS_CLASSES[ticket.status] ?? ""}`}
          >
            {t(`status.${ticket.status}` as Parameters<typeof t>[0])}
          </span>
        </div>
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
        <p className="mt-3 text-xs text-gray-400">
          {t("created")}: {formatDate(ticket.created_at)}
        </p>
      </div>

      {/* Satisfaction rating (resolved only) */}
      {ticket.status === "resolved" && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 mb-4">
          <h2 className="font-semibold text-gray-900 mb-3">{t("satisfaction")}</h2>
          {ratingSubmitted ? (
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={`text-xl ${star <= rating ? "text-yellow-400" : "text-gray-200"}`}
                  >
                    ★
                  </span>
                ))}
              </div>
              <span className="text-sm text-gray-500">Thank you for your feedback!</span>
            </div>
          ) : (
            <form onSubmit={handleRatingSubmit} className="flex flex-col gap-3">
              <StarRating value={rating} onChange={setRating} />
              <textarea
                className="min-h-[72px] w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-blue-400 resize-none"
                placeholder="Any additional comments? (optional)"
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                disabled={ratingSubmitting}
              />
              <div>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!rating || ratingSubmitting}
                >
                  {t("submitRating")}
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Comments */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-gray-900 mb-4">
          Replies ({comments.length})
        </h2>

        {comments.length === 0 && (
          <p className="text-sm text-gray-500 mb-4">No replies yet.</p>
        )}

        <div className="flex flex-col gap-3 mb-5">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-lg border border-gray-100 bg-gray-50 p-3"
            >
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{comment.body}</p>
              <p className="text-xs text-gray-400 mt-1.5">
                {formatDate(comment.created_at)}
              </p>
            </div>
          ))}
        </div>

        {/* Reply form — only show if not closed */}
        {ticket.status !== "closed" && (
          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Add a reply</h3>
            <TicketCommentForm
              ticketId={ticket.id}
              onCommentAdded={fetchData}
              showInternalToggle={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}
