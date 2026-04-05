"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

// Graceful fallback if auth context isn't ready yet
let useAuth: (() => { user: unknown; org: { id: string } | null; accessToken: string | null; loading: boolean }) | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  useAuth = require("@/lib/auth-context").useAuth;
} catch {
  useAuth = null;
}

interface SearchResult {
  id: string;
  type: "messages" | "tickets" | "wiki" | "discussions";
  title: string;
  preview?: string;
  href: string;
}

interface SearchResponse {
  messages?: Array<{ id: string; content: string; channel_id: string }>;
  tickets?: Array<{ id: string; subject: string; description?: string }>;
  wiki?: Array<{ id: string; title: string; content?: string; space_id: string }>;
  discussions?: Array<{ id: string; title: string; body?: string }>;
}

function useAuthSafe() {
  if (useAuth) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useAuth();
  }
  return { user: null, org: null, accessToken: null, loading: false };
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const router = useRouter();
  const t = useTranslations("nav");

  const auth = useAuthSafe();
  const { org, accessToken } = auth;

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const doSearch = useCallback(
    async (q: string) => {
      if (!q.trim() || !org?.id || !accessToken) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
        const params = new URLSearchParams({
          q,
          scope: "messages,tickets,wiki,discussions",
        });
        const res = await fetch(
          `${apiUrl}/api/v1/orgs/${org.id}/search?${params.toString()}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        if (!res.ok) {
          setResults([]);
          return;
        }
        const data: SearchResponse = await res.json();
        const mapped: SearchResult[] = [];

        (data.messages ?? []).forEach((m) => {
          mapped.push({
            id: `msg-${m.id}`,
            type: "messages",
            title: m.content.slice(0, 80),
            preview: m.content.length > 80 ? m.content.slice(0, 120) + "…" : undefined,
            href: `/chat?channel=${m.channel_id}&message=${m.id}`,
          });
        });

        (data.tickets ?? []).forEach((tk) => {
          mapped.push({
            id: `ticket-${tk.id}`,
            type: "tickets",
            title: tk.subject,
            preview: tk.description?.slice(0, 100),
            href: `/tickets/${tk.id}`,
          });
        });

        (data.wiki ?? []).forEach((w) => {
          mapped.push({
            id: `wiki-${w.id}`,
            type: "wiki",
            title: w.title,
            preview: w.content?.slice(0, 100),
            href: `/wiki/${w.space_id}/${w.id}`,
          });
        });

        (data.discussions ?? []).forEach((d) => {
          mapped.push({
            id: `disc-${d.id}`,
            type: "discussions",
            title: d.title,
            preview: d.body?.slice(0, 100),
            href: `/threads/${d.id}`,
          });
        });

        setResults(mapped);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    },
    [org?.id, accessToken]
  );

  // Debounce search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      doSearch(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, doSearch]);

  function navigate(path: string) {
    setOpen(false);
    setQuery("");
    setResults([]);
    router.push(path);
  }

  const hasQuery = query.trim().length > 0;

  const byType = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {});

  const typeLabels: Record<string, string> = {
    messages: "Messages",
    tickets: "Tickets",
    wiki: "Wiki",
    discussions: "Discussions",
  };

  return (
    <CommandDialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setQuery(""); setResults([]); } }}>
      <CommandInput
        placeholder="Search or navigate..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {hasQuery ? (
          <>
            {searching && (
              <div className="py-6 text-center text-sm text-text-secondary">
                Searching...
              </div>
            )}
            {!searching && results.length === 0 && (
              <CommandEmpty>No results found.</CommandEmpty>
            )}
            {!searching &&
              Object.entries(byType).map(([type, items], idx) => (
                <div key={type}>
                  {idx > 0 && <CommandSeparator />}
                  <CommandGroup heading={typeLabels[type] ?? type}>
                    {items.map((item) => (
                      <CommandItem
                        key={item.id}
                        onSelect={() => navigate(item.href)}
                        className="flex flex-col items-start gap-0.5"
                      >
                        <span className="font-medium text-text-primary line-clamp-1">
                          {item.title}
                        </span>
                        {item.preview && (
                          <span className="text-xs text-text-secondary line-clamp-1">
                            {item.preview}
                          </span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </div>
              ))}
          </>
        ) : (
          <CommandGroup heading="Navigation">
            <CommandItem onSelect={() => navigate("/chat")}>{t("chat")}</CommandItem>
            <CommandItem onSelect={() => navigate("/threads")}>{t("threads")}</CommandItem>
            <CommandItem onSelect={() => navigate("/wiki")}>{t("wiki")}</CommandItem>
            <CommandItem onSelect={() => navigate("/tickets")}>{t("tickets")}</CommandItem>
            <CommandItem onSelect={() => navigate("/admin")}>{t("admin")}</CommandItem>
            <CommandItem onSelect={() => navigate("/settings")}>{t("settings")}</CommandItem>
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
