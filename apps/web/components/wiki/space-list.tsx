"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { PlusIcon, BookOpenIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWikiStore } from "@/stores/wiki-store";
import { useAuth } from "@/lib/auth-context";
import type { WikiSpace } from "@ollo-dev/shared/types";

export function SpaceList() {
  const t = useTranslations("wiki");
  const { spaces, activeSpaceId, setSpaces, setActiveSpace } = useWikiStore();
  const { org, accessToken } = useAuth();
  const orgId = org?.id;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId || !accessToken) return;

    const fetchSpaces = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/wiki/spaces`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!res.ok) throw new Error("Failed to fetch wiki spaces");
        const json = await res.json();
        setSpaces(json.data ?? json);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    fetchSpaces();
  }, [orgId, accessToken, setSpaces]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle shrink-0">
        <span className="text-[13px] font-semibold text-text-tertiary">
          {t("title")}
        </span>
        <Button size="icon" variant="ghost" className="size-7 rounded-radius-sm text-text-tertiary hover:text-text-primary" title={t("newSpace")}>
          <PlusIcon className="size-3.5" />
        </Button>
      </div>

      {/* Space list */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading && (
          <div className="px-3 py-6 text-[13px] text-text-tertiary text-center">Loading...</div>
        )}
        {error && (
          <div className="px-3 py-2 text-[13px] text-error">{error}</div>
        )}
        {!loading && !error && spaces.length === 0 && (
          <div className="px-3 py-6 text-[13px] text-text-tertiary text-center">{t("noSpaces")}</div>
        )}
        {!loading &&
          !error &&
          spaces.map((space) => (
            <button
              key={space.id}
              onClick={() => setActiveSpace(space.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-radius-sm transition-all duration-150 text-left ${
                activeSpaceId === space.id
                  ? "bg-accent/10 text-accent font-medium shadow-sm"
                  : "text-text-secondary hover:bg-surface-tertiary/50 hover:text-text-primary"
              }`}
            >
              <span className="leading-none shrink-0">
                {space.icon ?? <BookOpenIcon className="size-4 opacity-70" />}
              </span>
              <span className="truncate">{space.name}</span>
            </button>
          ))}
      </div>
    </div>
  );
}
