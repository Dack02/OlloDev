"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CreateTicketDialog } from "@/components/tickets/create-ticket-dialog";
import { useAuth } from "@/lib/auth-context";
import type { Ticket } from "@ollo-dev/shared/types";

const STATUS_CLASSES: Record<string, string> = {
  open: "bg-blue-100 text-blue-700",
  pending: "bg-yellow-100 text-yellow-700",
  in_progress: "bg-purple-100 text-purple-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-600",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function PortalTicketsPage() {
  const t = useTranslations("tickets");
  const tPortal = useTranslations("portal");
  const { org, accessToken } = useAuth();
  const orgId = org?.id;
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId || !accessToken) return;

    const fetchTickets = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/tickets?mine=true`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!res.ok) throw new Error("Failed to fetch tickets");
        const json = await res.json();
        setTickets(json.data ?? json);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, [orgId, accessToken]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{tPortal("myTickets")}</h1>
          <p className="mt-1 text-sm text-gray-500">{tPortal("trackTicket")}</p>
        </div>
        <CreateTicketDialog
          trigger={<Button size="sm">{t("submitTicket")}</Button>}
        />
      </div>

      {loading && (
        <div className="text-center py-12 text-gray-500 text-sm">Loading...</div>
      )}
      {error && (
        <div className="text-center py-12 text-red-600 text-sm">{error}</div>
      )}
      {!loading && !error && tickets.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-sm">{t("noTickets")}</p>
          <div className="mt-4">
            <CreateTicketDialog
              trigger={<Button>{t("submitTicket")}</Button>}
            />
          </div>
        </div>
      )}

      {!loading && !error && tickets.length > 0 && (
        <div className="flex flex-col gap-3">
          {tickets.map((ticket) => (
            <Link
              key={ticket.id}
              href={`tickets/${ticket.id}`}
              className="block rounded-xl border border-gray-200 bg-white p-4 hover:border-gray-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{ticket.subject}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {t("created")}: {formatDate(ticket.created_at)}
                  </p>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CLASSES[ticket.status] ?? ""}`}
                >
                  {t(`status.${ticket.status}` as Parameters<typeof t>[0])}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
