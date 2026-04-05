"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { SpaceList } from "@/components/wiki/space-list";
import { PageTree } from "@/components/wiki/page-tree";
import { PageViewer } from "@/components/wiki/page-viewer";
import { useWikiStore } from "@/stores/wiki-store";
import { FileTextIcon, ArrowLeftIcon } from "lucide-react";

type MobileView = "spaces" | "pages" | "viewer";

export default function WikiPage() {
  const t = useTranslations("wiki");
  const { activePageId } = useWikiStore();
  const [mobileView, setMobileView] = useState<MobileView>("spaces");

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Desktop: 3-column layout ── */}
      <div className="hidden md:flex h-full w-full overflow-hidden">
        <div className="w-[200px] shrink-0 border-r border-border-subtle bg-surface-secondary/50 overflow-hidden flex flex-col">
          <SpaceList />
        </div>
        <div className="w-[240px] shrink-0 border-r border-border-subtle overflow-hidden flex flex-col">
          <PageTree />
        </div>
        <div className="flex-1 overflow-hidden">
          {activePageId ? (
            <PageViewer pageId={activePageId} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-text-tertiary">
              <div className="size-12 rounded-xl bg-surface-secondary flex items-center justify-center">
                <FileTextIcon className="size-5 opacity-40" />
              </div>
              <p className="text-[13px]">{t("selectPage")}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile: stacked navigation ── */}
      <div className="md:hidden flex flex-col h-full w-full overflow-hidden">
        {mobileView === "spaces" && (
          <div className="flex-1 overflow-hidden flex flex-col" onClick={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest("a, button")) {
              setMobileView("pages");
            }
          }}>
            <SpaceList />
          </div>
        )}

        {mobileView === "pages" && (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border-subtle shrink-0">
              <button
                onClick={() => setMobileView("spaces")}
                className="p-1.5 rounded-radius-sm text-text-tertiary hover:text-text-secondary hover:bg-surface-tertiary/50 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Back to spaces"
              >
                <ArrowLeftIcon className="size-5" />
              </button>
              <span className="text-[13px] font-medium text-text-secondary">Spaces</span>
            </div>
            <div className="flex-1 overflow-hidden" onClick={(e) => {
              // If a page link was clicked, navigate to viewer
              const target = e.target as HTMLElement;
              if (target.closest("a, button[data-page-id]")) {
                setMobileView("viewer");
              }
            }}>
              <PageTree />
            </div>
          </div>
        )}

        {mobileView === "viewer" && (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border-subtle shrink-0">
              <button
                onClick={() => setMobileView("pages")}
                className="p-1.5 rounded-radius-sm text-text-tertiary hover:text-text-secondary hover:bg-surface-tertiary/50 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Back to pages"
              >
                <ArrowLeftIcon className="size-5" />
              </button>
              <span className="text-[13px] font-medium text-text-secondary">Pages</span>
            </div>
            <div className="flex-1 overflow-hidden">
              {activePageId ? (
                <PageViewer pageId={activePageId} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-text-tertiary">
                  <div className="size-12 rounded-xl bg-surface-secondary flex items-center justify-center">
                    <FileTextIcon className="size-5 opacity-40" />
                  </div>
                  <p className="text-[13px]">{t("selectPage")}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
