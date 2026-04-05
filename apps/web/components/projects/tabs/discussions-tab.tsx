"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  MessageSquareIcon,
  PinIcon,
  LockIcon,
  ThumbsUpIcon,
} from "lucide-react";
import { FilterBar } from "@/components/ui/filter-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useDiscussionsStore } from "@/stores/discussions-store";
import { useAuth } from "@/lib/auth-context";
import { CreateDiscussionDialog } from "@/components/discussions/create-discussion-dialog";
import { DiscussionDetail } from "@/components/discussions/discussion-detail";
import { Button } from "@/components/ui/button";
import type { Discussion } from "@ollo-dev/shared/types";

const CATEGORIES = ["all", "general", "ideas", "bugs", "announcements"] as const;
type CategoryFilter = (typeof CATEGORIES)[number];

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

interface DiscussionsTabProps {
  projectId: string;
}

export function DiscussionsTab({ projectId }: DiscussionsTabProps) {
  const t = useTranslations("discussions");
  const { discussions, activeDiscussionId, setDiscussions, setActiveDiscussion } =
    useDiscussionsStore();
  const { org, accessToken } = useAuth();
  const orgId = org?.id;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");

  useEffect(() => {
    if (!orgId || !accessToken) return;

    const fetchDiscussions = async () => {
      setLoading(true);
      setError(null);
      try {
        const url = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/discussions?project_id=${projectId}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) throw new Error("Failed to fetch discussions");
        const json = await res.json();
        setDiscussions(json.data ?? json);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    fetchDiscussions();
  }, [orgId, accessToken, projectId, setDiscussions]);

  const projectDiscussions = discussions.filter(
    (d) => d.project_id === projectId
  );

  const filtered =
    categoryFilter === "all"
      ? projectDiscussions
      : projectDiscussions.filter((d) => d.category === categoryFilter);

  const pinned = filtered.filter((d) => d.is_pinned);
  const unpinned = filtered.filter((d) => !d.is_pinned);
  const sorted = [...pinned, ...unpinned];

  const tabItems = CATEGORIES.map((cat) => ({
    value: cat,
    label: t(`categories.${cat}` as Parameters<typeof t>[0]),
  }));

  const activeDiscussion = activeDiscussionId
    ? projectDiscussions.find((d) => d.id === activeDiscussionId)
    : null;

  return (
    <div className="flex h-full">
      {/* Discussion list */}
      <div className="w-[380px] shrink-0 border-r border-border-subtle flex flex-col h-full">
        <div className="px-4 py-3 flex items-center justify-between border-b border-border-subtle">
          <h2 className="text-[13px] font-semibold text-text-primary">
            Discussions
          </h2>
          <CreateDiscussionDialog
            projectId={projectId}
            trigger={<Button size="sm">New</Button>}
          />
        </div>

        <FilterBar>
          <FilterBar.Tabs
            items={tabItems}
            value={categoryFilter}
            onChange={(v) => setCategoryFilter(v as CategoryFilter)}
          />
        </FilterBar>

        <div className="flex-1 overflow-y-auto divide-y divide-border-subtle">
          {loading && (
            <div className="p-6 text-center text-text-tertiary text-[13px]">
              Loading...
            </div>
          )}
          {error && (
            <div className="p-6 text-center text-[13px] text-error">{error}</div>
          )}
          {!loading && !error && sorted.length === 0 && (
            <div className="p-6 text-center text-text-tertiary text-[13px]">
              {t("noDiscussions")}
            </div>
          )}
          {!loading &&
            !error &&
            sorted.map((discussion) => (
              <button
                key={discussion.id}
                onClick={() => setActiveDiscussion(discussion.id)}
                className={`w-full text-left px-4 py-3 transition-all duration-150 hover:bg-surface-secondary/60 ${
                  activeDiscussionId === discussion.id ? "bg-accent-muted" : ""
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {discussion.is_pinned && (
                        <PinIcon className="size-3 text-accent shrink-0" />
                      )}
                      {discussion.is_locked && (
                        <LockIcon className="size-3 text-text-tertiary shrink-0" />
                      )}
                      <span className="text-[13px] font-medium text-text-primary line-clamp-1">
                        {discussion.title}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1 mt-1.5">
                      {discussion.category && (
                        <StatusBadge
                          kind="category"
                          value={discussion.category}
                          label={t(`categories.${discussion.category}` as Parameters<typeof t>[0])}
                        />
                      )}
                      {discussion.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md bg-surface-tertiary/60 px-1.5 py-[2px] text-[10px] font-medium text-text-tertiary"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-3 mt-2 text-[11px] text-text-tertiary">
                      <span className="flex items-center gap-1">
                        <ThumbsUpIcon className="size-3" />
                        {discussion.upvotes}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquareIcon className="size-3" />
                        {discussion.reply_count}
                      </span>
                      <span>{timeAgo(discussion.created_at)}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
        </div>
      </div>

      {/* Detail panel */}
      <div className="flex-1 overflow-hidden">
        {activeDiscussion ? (
          <DiscussionDetail discussionId={activeDiscussion.id} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="size-12 rounded-xl bg-surface-secondary flex items-center justify-center mx-auto mb-3">
                <MessageSquareIcon className="size-5 text-text-tertiary" />
              </div>
              <p className="text-[14px] text-text-secondary">
                Select a discussion to view details
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
