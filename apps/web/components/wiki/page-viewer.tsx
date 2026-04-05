"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { PencilIcon, HistoryIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageEditor } from "./page-editor";
import { useAuth } from "@/lib/auth-context";
import type { WikiPage } from "@ollo-dev/shared/types";

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

interface PageViewerProps {
  pageId: string;
}

export function PageViewer({ pageId }: PageViewerProps) {
  const t = useTranslations("wiki");
  const { org, accessToken } = useAuth();
  const orgId = org?.id;
  const [page, setPage] = useState<WikiPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const fetchPage = useCallback(async () => {
    if (!orgId || !accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/wiki/pages/${pageId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!res.ok) throw new Error("Failed to fetch page");
      const json = await res.json();
      setPage(json.data ?? json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [pageId, orgId, accessToken]);

  useEffect(() => {
    setEditing(false);
    fetchPage();
  }, [fetchPage]);

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

  if (!page) return null;

  if (editing) {
    return (
      <PageEditor
        page={page}
        onCancel={() => setEditing(false)}
        onSaved={(updated) => {
          setPage(updated);
          setEditing(false);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between px-6 py-4 border-b border-border-subtle bg-surface-primary shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">{page.title}</h1>
          <p className="text-xs text-text-secondary mt-1">
            {t("lastEdited", { time: timeAgo(page.updated_at) })}{" "}
            {page.last_edited_by && (
              <span>by {page.last_edited_by}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="flex items-center gap-1.5"
            title={t("versionHistory")}
          >
            <HistoryIcon className="size-3.5" />
            <span className="hidden sm:inline">{t("versionHistory")}</span>
          </Button>
          <Button
            size="sm"
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5"
          >
            <PencilIcon className="size-3.5" />
            {t("editPage")}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="prose prose-sm max-w-none text-text-primary">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-text-primary">
            {page.content}
          </pre>
        </div>
      </div>
    </div>
  );
}
