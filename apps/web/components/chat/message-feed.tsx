"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { useChatStore } from "@/stores/chat-store";
import { useAuth } from "@/lib/auth-context";
import type { Message } from "@ollo-dev/shared/types";

function formatTime(dateStr: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(dateStr));
}

function AuthorAvatar({ authorId }: { authorId: string }) {
  const initial = authorId.charAt(0).toUpperCase();
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/20">
      <span className="text-xs font-semibold text-accent">{initial}</span>
    </div>
  );
}

function MessageItem({ message }: { message: Message }) {
  const t = useTranslations("chat");

  return (
    <div className="group flex gap-3 px-4 py-1.5 hover:bg-surface-secondary/50">
      <AuthorAvatar authorId={message.author_id} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-text-primary">
            {message.author_id}
          </span>
          <span className="text-xs text-text-secondary">{formatTime(message.created_at)}</span>
        </div>

        {message.is_deleted ? (
          <p className="text-sm italic text-text-secondary">{t("deleted")}</p>
        ) : (
          <>
            <p className="whitespace-pre-wrap break-words text-sm text-text-primary">
              {message.content}
              {message.is_edited && (
                <span className="ml-1 text-xs text-text-secondary">{t("edited")}</span>
              )}
            </p>

            {/* Reactions */}
            {message.reactions && Object.keys(message.reactions).length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {Object.entries(message.reactions).map(([emoji, userIds]) => (
                  <Badge
                    key={emoji}
                    variant="secondary"
                    className="cursor-pointer gap-1 px-1.5 py-0.5 text-xs hover:bg-accent/10"
                  >
                    <span>{emoji}</span>
                    <span>{(userIds as string[]).length}</span>
                  </Badge>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TypingIndicator({ channelId }: { channelId: string }) {
  const t = useTranslations("chat");
  const { typingUsers } = useChatStore();
  const typing = typingUsers[channelId] ?? [];

  if (typing.length === 0) return null;

  const text =
    typing.length === 1
      ? t("typing", { name: typing[0] })
      : t("typingMultiple", { count: typing.length });

  return (
    <div className="px-4 py-1 text-xs italic text-text-secondary">
      {text}
    </div>
  );
}

export function MessageFeed() {
  const t = useTranslations("chat");
  const { messages, activeChannelId, setMessages } = useChatStore();
  const { org, accessToken } = useAuth();
  const orgId = org?.id;
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(
    async (channelId: string, beforeCursor?: string | null) => {
      if (!orgId || !accessToken) return;
      setIsLoading(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
        const url = new URL(
          `${apiUrl}/api/v1/orgs/${orgId}/channels/${channelId}/messages`
        );
        if (beforeCursor) url.searchParams.set("before", beforeCursor);

        const res = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) throw new Error("Failed to fetch messages");
        const json = await res.json();

        const newMessages: Message[] = json.data ?? json;
        const meta = json.meta;

        if (beforeCursor) {
          // Prepend older messages — read current state from the store directly
          const currentMessages = useChatStore.getState().messages;
          setMessages([...newMessages, ...currentMessages]);
        } else {
          setMessages(newMessages);
        }

        setHasMore(meta?.has_more ?? false);
        setCursor(meta?.cursor ?? null);
      } catch (err) {
        console.error("[MessageFeed] fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [orgId, accessToken, setMessages]
  );

  // Fetch messages when active channel changes
  useEffect(() => {
    if (!activeChannelId) return;
    fetchMessages(activeChannelId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChannelId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load more on scroll to top
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      if (el.scrollTop === 0 && hasMore && !isLoading && activeChannelId) {
        fetchMessages(activeChannelId, cursor);
      }
    },
    [hasMore, isLoading, activeChannelId, cursor, fetchMessages]
  );

  if (!activeChannelId) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-text-secondary">Select a channel to start chatting</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        onScroll={handleScroll}
      >
        {/* Load more */}
        {hasMore && (
          <div className="flex justify-center py-2">
            <button
              onClick={() => fetchMessages(activeChannelId, cursor)}
              disabled={isLoading}
              className="text-xs text-accent hover:underline disabled:opacity-50"
            >
              {isLoading ? "Loading..." : t("loadMore")}
            </button>
          </div>
        )}

        {isLoading && messages.length === 0 && (
          <div className="flex flex-1 items-center justify-center py-8">
            <p className="text-sm text-text-secondary">Loading...</p>
          </div>
        )}

        {!isLoading && messages.length === 0 && (
          <div className="flex flex-1 items-center justify-center py-8">
            <p className="text-sm text-text-secondary">{t("noMessages")}</p>
          </div>
        )}

        {messages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}

        <div ref={bottomRef} />
      </div>

      <TypingIndicator channelId={activeChannelId} />
    </div>
  );
}
