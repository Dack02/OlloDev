"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useChatStore } from "@/stores/chat-store";
import { useAuth } from "@/lib/auth-context";
import type { Channel } from "@ollo-dev/shared/types";

function LockIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0 text-text-secondary"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

export function ChannelList() {
  const t = useTranslations("chat");
  const { channels, activeChannelId, setChannels, setActiveChannel } = useChatStore();
  const { org, accessToken } = useAuth();
  const orgId = org?.id;
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!orgId || !accessToken) return;

    const fetchChannels = async () => {
      setIsLoading(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
        const res = await fetch(`${apiUrl}/api/v1/orgs/${orgId}/channels`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) throw new Error("Failed to fetch channels");
        const json = await res.json();
        setChannels(json.data ?? json);
      } catch (err) {
        console.error("[ChannelList] fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChannels();
  }, [orgId, accessToken, setChannels]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle shrink-0">
        <span className="text-[13px] font-semibold text-text-tertiary">
          Channels
        </span>
        <Button
          variant="ghost"
          size="icon-xs"
          className="text-text-tertiary hover:text-text-primary"
          title={t("newChannel")}
        >
          <PlusIcon />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="px-3 py-6 text-[13px] text-text-tertiary text-center">Loading...</div>
        ) : channels.length === 0 ? (
          <div className="px-3 py-6 text-[13px] text-text-tertiary text-center">No channels</div>
        ) : (
          <ul className="space-y-1 p-2">
            {channels.map((channel: Channel) => {
              const isActive = channel.id === activeChannelId;
              const isPrivate = channel.type === "private";

              return (
                <li key={channel.id}>
                  <button
                    onClick={() => setActiveChannel(channel.id)}
                    className={[
                      "flex w-full items-center gap-2.5 rounded-radius-sm px-3 py-2 text-[13px] transition-all duration-150",
                      isActive
                        ? "bg-accent/10 font-medium text-accent shadow-sm"
                        : "text-text-secondary hover:bg-surface-tertiary/50 hover:text-text-primary",
                    ].join(" ")}
                  >
                    {isPrivate ? (
                      <LockIcon />
                    ) : (
                      <span className="shrink-0 text-text-tertiary font-medium">#</span>
                    )}
                    <span className="truncate">{channel.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}
