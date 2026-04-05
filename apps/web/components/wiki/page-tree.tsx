"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { PlusIcon, FileTextIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWikiStore } from "@/stores/wiki-store";
import { useAuth } from "@/lib/auth-context";
import type { WikiPage } from "@ollo-dev/shared/types";

interface PageNodeProps {
  page: WikiPage;
  allPages: WikiPage[];
  depth: number;
  activePageId: string | null;
  onSelect: (id: string) => void;
}

function PageNode({ page, allPages, depth, activePageId, onSelect }: PageNodeProps) {
  const children = allPages
    .filter((p) => p.parent_id === page.id)
    .sort((a, b) => a.sort_order - b.sort_order);
  const [expanded, setExpanded] = useState(true);
  const hasChildren = children.length > 0;

  return (
    <div>
      <div
        className={`flex items-center gap-1.5 py-1.5 pr-2 rounded-radius-sm cursor-pointer transition-all duration-150 group ${
          activePageId === page.id
            ? "bg-accent/10 text-accent font-medium"
            : "text-text-secondary hover:bg-surface-tertiary/50 hover:text-text-primary"
        }`}
        style={{ paddingLeft: `${10 + depth * 16}px` }}
        onClick={() => onSelect(page.id)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            className="shrink-0 p-0.5 rounded-[4px] hover:bg-surface-tertiary/60 transition-colors"
          >
            <ChevronRightIcon
              className={`size-3 text-text-tertiary transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
            />
          </button>
        ) : (
          <span className="size-4 shrink-0" />
        )}
        <FileTextIcon className="size-3.5 shrink-0 opacity-60" />
        <span className="text-[13px] truncate">{page.title}</span>
      </div>

      {expanded && hasChildren && (
        <div>
          {children.map((child) => (
            <PageNode
              key={child.id}
              page={child}
              allPages={allPages}
              depth={depth + 1}
              activePageId={activePageId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function PageTree() {
  const t = useTranslations("wiki");
  const { activeSpaceId, pages, activePageId, setPages, setActivePage } = useWikiStore();
  const { org, accessToken } = useAuth();
  const orgId = org?.id;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeSpaceId || !orgId || !accessToken) {
      setPages([]);
      return;
    }

    const fetchPages = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/wiki/spaces/${activeSpaceId}/pages`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!res.ok) throw new Error("Failed to fetch pages");
        const json = await res.json();
        setPages(json.data ?? json);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    fetchPages();
  }, [activeSpaceId, orgId, accessToken, setPages]);

  const rootPages = pages
    .filter((p) => p.parent_id === null)
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle shrink-0">
        <span className="text-[13px] font-semibold text-text-tertiary">
          Pages
        </span>
        {activeSpaceId && (
          <Button size="icon" variant="ghost" className="size-7 rounded-radius-sm text-text-tertiary hover:text-text-primary" title={t("newPage")}>
            <PlusIcon className="size-3.5" />
          </Button>
        )}
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto p-2">
        {!activeSpaceId && (
          <div className="px-3 py-8 text-[13px] text-text-tertiary text-center">
            Select a space to view pages.
          </div>
        )}
        {loading && (
          <div className="px-3 py-6 text-[13px] text-text-tertiary text-center">Loading...</div>
        )}
        {error && (
          <div className="px-3 py-2 text-[13px] text-error">{error}</div>
        )}
        {!loading && !error && activeSpaceId && pages.length === 0 && (
          <div className="px-3 py-2 text-xs text-text-secondary">{t("noPages")}</div>
        )}
        {!loading &&
          !error &&
          rootPages.map((page) => (
            <PageNode
              key={page.id}
              page={page}
              allPages={pages}
              depth={0}
              activePageId={activePageId}
              onSelect={setActivePage}
            />
          ))}
      </div>
    </div>
  );
}
