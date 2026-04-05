"use client";

import { useTranslations } from "next-intl";
import { DiscussionList } from "@/components/discussions/discussion-list";
import { DiscussionDetail } from "@/components/discussions/discussion-detail";
import { CreateDiscussionDialog } from "@/components/discussions/create-discussion-dialog";
import { useDiscussionsStore } from "@/stores/discussions-store";
import { DetailPanel } from "@/components/layout/detail-panel";

export default function ThreadsPage() {
  const t = useTranslations("discussions");
  const { activeDiscussionId, setActiveDiscussion } = useDiscussionsStore();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Page header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border-subtle shrink-0">
        <h1 className="text-[15px] font-semibold text-text-primary">{t("title")}</h1>
        <CreateDiscussionDialog />
      </div>

      {/* Two-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Discussion list */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <DiscussionList />
        </div>

        {/* Right: Discussion detail panel */}
        <DetailPanel
          open={!!activeDiscussionId}
          onClose={() => setActiveDiscussion(null)}
          title="Discussion"
          width="w-[460px]"
        >
          {activeDiscussionId && (
            <DiscussionDetail discussionId={activeDiscussionId} />
          )}
        </DetailPanel>
      </div>
    </div>
  );
}
