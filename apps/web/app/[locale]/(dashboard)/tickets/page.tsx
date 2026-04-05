"use client";

import { useTranslations } from "next-intl";
import { TicketList } from "@/components/tickets/ticket-list";
import { TicketDetail } from "@/components/tickets/ticket-detail";
import { CreateTicketDialog } from "@/components/tickets/create-ticket-dialog";
import { useTicketStore } from "@/stores/ticket-store";
import { DetailPanel } from "@/components/layout/detail-panel";

export default function TicketsPage() {
  const t = useTranslations("tickets");
  const { activeTicketId, setActiveTicket } = useTicketStore();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Page header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border-subtle shrink-0">
        <h1 className="text-[15px] font-semibold text-text-primary">{t("title")}</h1>
        <CreateTicketDialog />
      </div>

      {/* Two-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Ticket list */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <TicketList />
        </div>

        {/* Right: Ticket detail panel */}
        <DetailPanel
          open={!!activeTicketId}
          onClose={() => setActiveTicket(null)}
          title="Ticket details"
          width="w-[420px]"
        >
          {activeTicketId && (
            <TicketDetail ticketId={activeTicketId} />
          )}
        </DetailPanel>
      </div>
    </div>
  );
}
