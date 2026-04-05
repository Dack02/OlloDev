"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Graceful import of auth context
let useAuthHook: (() => {
  org: { id: string } | null;
  accessToken: string | null;
  loading: boolean;
}) | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  useAuthHook = require("@/lib/auth-context").useAuth;
} catch {
  useAuthHook = null;
}

function useAuthSafe() {
  if (useAuthHook) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useAuthHook();
  }
  return { org: null, accessToken: null, loading: false };
}

interface Metrics {
  totalTickets: number;
  openTickets: number;
  totalMessages: number;
  totalDiscussions: number;
  totalWikiPages: number;
  avgResolutionHours: number | null;
  slaBreachPct: number | null;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
}

function MetricCard({ title, value, subtitle }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-text-secondary">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold text-text-primary">{value}</p>
        {subtitle && (
          <p className="mt-1 text-xs text-text-secondary">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminPage() {
  const t = useTranslations("admin");
  const { org, accessToken } = useAuthSafe();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

  useEffect(() => {
    if (!org?.id || !accessToken) {
      setLoading(false);
      return;
    }
    const headers: HeadersInit = { Authorization: `Bearer ${accessToken}` };

    async function fetchAll() {
      setLoading(true);
      try {
        const [ticketsRes, messagesRes, discussionsRes, wikiRes] = await Promise.allSettled([
          fetch(`${apiUrl}/api/v1/orgs/${org!.id}/tickets?limit=1000`, { headers }),
          fetch(`${apiUrl}/api/v1/orgs/${org!.id}/messages?limit=1000`, { headers }),
          fetch(`${apiUrl}/api/v1/orgs/${org!.id}/discussions?limit=1000`, { headers }),
          fetch(`${apiUrl}/api/v1/orgs/${org!.id}/wiki/pages?limit=1000`, { headers }),
        ]);

        // Tickets metrics
        let totalTickets = 0;
        let openTickets = 0;
        let avgResolutionHours: number | null = null;
        let slaBreachPct: number | null = null;

        if (ticketsRes.status === "fulfilled" && ticketsRes.value.ok) {
          const data = await ticketsRes.value.json();
          const list: Array<{ status: string; created_at: string; resolved_at?: string; sla_breached?: boolean }> =
            Array.isArray(data) ? data : (data.tickets ?? data.items ?? []);
          totalTickets = list.length;
          openTickets = list.filter((tk) => tk.status === "open" || tk.status === "pending" || tk.status === "in_progress").length;

          const resolved = list.filter((tk) => tk.resolved_at && tk.created_at);
          if (resolved.length > 0) {
            const totalMs = resolved.reduce((sum, tk) => {
              return sum + (new Date(tk.resolved_at!).getTime() - new Date(tk.created_at).getTime());
            }, 0);
            avgResolutionHours = Math.round((totalMs / resolved.length) / (1000 * 60 * 60));
          }

          const breached = list.filter((tk) => tk.sla_breached);
          if (totalTickets > 0) {
            slaBreachPct = Math.round((breached.length / totalTickets) * 100);
          }
        }

        // Messages count
        let totalMessages = 0;
        if (messagesRes.status === "fulfilled" && messagesRes.value.ok) {
          const data = await messagesRes.value.json();
          const list = Array.isArray(data) ? data : (data.messages ?? data.items ?? []);
          totalMessages = list.length;
        }

        // Discussions count
        let totalDiscussions = 0;
        if (discussionsRes.status === "fulfilled" && discussionsRes.value.ok) {
          const data = await discussionsRes.value.json();
          const list = Array.isArray(data) ? data : (data.discussions ?? data.items ?? []);
          totalDiscussions = list.length;
        }

        // Wiki pages count
        let totalWikiPages = 0;
        if (wikiRes.status === "fulfilled" && wikiRes.value.ok) {
          const data = await wikiRes.value.json();
          const list = Array.isArray(data) ? data : (data.pages ?? data.items ?? []);
          totalWikiPages = list.length;
        }

        setMetrics({
          totalTickets,
          openTickets,
          totalMessages,
          totalDiscussions,
          totalWikiPages,
          avgResolutionHours,
          slaBreachPct,
        });
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, [org?.id, accessToken, apiUrl]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">{t("title")}</h1>
        <p className="mt-1 text-sm text-text-secondary">{t("overview")}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-text-secondary">{t("loading")}</p>
        </div>
      ) : metrics === null ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-text-secondary">Connect your account to view analytics.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <MetricCard
            title={t("totalTickets")}
            value={metrics.totalTickets}
          />
          <MetricCard
            title={t("openTickets")}
            value={metrics.openTickets}
            subtitle={metrics.totalTickets > 0 ? `${Math.round((metrics.openTickets / metrics.totalTickets) * 100)}% of total` : undefined}
          />
          <MetricCard
            title="Avg Resolution Time"
            value={metrics.avgResolutionHours !== null ? `${metrics.avgResolutionHours}h` : "—"}
            subtitle="Based on resolved tickets"
          />
          <MetricCard
            title={t("slaCompliance")}
            value={metrics.slaBreachPct !== null ? `${100 - metrics.slaBreachPct}%` : "—"}
            subtitle={metrics.slaBreachPct !== null ? `${metrics.slaBreachPct}% breached` : undefined}
          />
          <MetricCard
            title={t("totalMessages")}
            value={metrics.totalMessages}
          />
          <MetricCard
            title={t("totalDiscussions")}
            value={metrics.totalDiscussions}
          />
          <MetricCard
            title={t("totalWikiPages")}
            value={metrics.totalWikiPages}
          />
        </div>
      )}
    </div>
  );
}
