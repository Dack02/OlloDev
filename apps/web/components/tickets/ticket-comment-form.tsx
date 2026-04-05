"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

interface TicketCommentFormProps {
  ticketId: string;
  onCommentAdded?: () => void;
  showInternalToggle?: boolean;
}

export function TicketCommentForm({
  ticketId,
  onCommentAdded,
  showInternalToggle = true,
}: TicketCommentFormProps) {
  const t = useTranslations("tickets");
  const { org, accessToken } = useAuth();
  const orgId = org?.id;
  const [body, setBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() || !orgId || !accessToken) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/tickets/${ticketId}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ body, is_internal: isInternal }),
        }
      );
      if (!res.ok) throw new Error("Failed to add comment");
      setBody("");
      setIsInternal(false);
      onCommentAdded?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <textarea
        className="min-h-[80px] w-full rounded-lg border border-border-subtle bg-surface-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent resize-none"
        placeholder={isInternal ? t("addInternalNote") : t("addComment")}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        disabled={submitting}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex items-center justify-between">
        {showInternalToggle && (
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="rounded border-border-subtle accent-accent"
              checked={isInternal}
              onChange={(e) => setIsInternal(e.target.checked)}
              disabled={submitting}
            />
            <span className="text-sm text-text-secondary">{t("internalNote")}</span>
          </label>
        )}
        <Button type="submit" size="sm" disabled={submitting || !body.trim()}>
          {isInternal ? t("addInternalNote") : t("addComment")}
        </Button>
      </div>
    </form>
  );
}
