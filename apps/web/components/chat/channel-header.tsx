"use client";

import { useTranslations } from "next-intl";
import { useChatStore } from "@/stores/chat-store";

export function ChannelHeader() {
  const t = useTranslations("chat");
  const { channels, activeChannelId, onlineUsers } = useChatStore();

  const activeChannel = channels.find((c) => c.id === activeChannelId);

  if (!activeChannel) {
    return (
      <div className="flex h-14 items-center border-b border-border-subtle px-4">
        <span className="text-sm text-text-secondary">Select a channel</span>
      </div>
    );
  }

  const isPrivate = activeChannel.type === "private";

  return (
    <div className="flex h-14 items-center gap-3 border-b border-border-subtle px-4">
      {/* Channel name */}
      <div className="flex items-center gap-1.5">
        {isPrivate ? (
          <svg
            className="h-4 w-4 text-text-secondary"
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
        ) : (
          <span className="text-text-secondary font-medium">#</span>
        )}
        <span className="font-semibold text-text-primary">{activeChannel.name}</span>
      </div>

      {/* Separator */}
      {activeChannel.description && (
        <>
          <div className="h-4 w-px bg-border-subtle" />
          <span className="truncate text-sm text-text-secondary">
            {activeChannel.description}
          </span>
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Online users */}
      {onlineUsers.length > 0 && (
        <div className="flex items-center gap-1.5">
          <div className="flex -space-x-1">
            {onlineUsers.slice(0, 5).map((userId) => (
              <div
                key={userId}
                className="relative h-6 w-6 rounded-full bg-accent/20 ring-2 ring-surface-primary"
                title={userId}
              >
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-accent">
                  {userId.charAt(0).toUpperCase()}
                </span>
                <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500 ring-1 ring-surface-primary" />
              </div>
            ))}
          </div>
          <span className="text-xs text-text-secondary">
            {t("members", { count: onlineUsers.length })}
          </span>
        </div>
      )}
    </div>
  );
}
