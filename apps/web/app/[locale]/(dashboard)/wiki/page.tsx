"use client";

import { useTranslations } from "next-intl";
import { SpaceList } from "@/components/wiki/space-list";
import { PageTree } from "@/components/wiki/page-tree";
import { PageViewer } from "@/components/wiki/page-viewer";
import { useWikiStore } from "@/stores/wiki-store";
import { FileTextIcon } from "lucide-react";

export default function WikiPage() {
  const t = useTranslations("wiki");
  const { activePageId } = useWikiStore();

  return (
    <div className="flex h-full overflow-hidden">
      {/* Column 1: Space list */}
      <div className="w-[200px] shrink-0 border-r border-border-subtle bg-surface-secondary/50 overflow-hidden flex flex-col">
        <SpaceList />
      </div>

      {/* Column 2: Page tree */}
      <div className="w-[240px] shrink-0 border-r border-border-subtle overflow-hidden flex flex-col">
        <PageTree />
      </div>

      {/* Column 3: Page content */}
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
  );
}
