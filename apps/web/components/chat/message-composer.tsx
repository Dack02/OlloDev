"use client";

import { useState, useRef, useCallback, KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useChatStore } from "@/stores/chat-store";
import { useAuth } from "@/lib/auth-context";

interface MessageComposerProps {
  onTyping?: (channelId: string) => void;
}

function SendIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
      />
    </svg>
  );
}

export function MessageComposer({ onTyping }: MessageComposerProps) {
  const t = useTranslations("chat");
  const { activeChannelId } = useChatStore();
  const { org, accessToken } = useAuth();
  const orgId = org?.id;
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef<number>(0);

  const handleTyping = useCallback(() => {
    if (!activeChannelId) return;

    const now = Date.now();
    // Send typing indicator at most once every 3 seconds
    if (now - lastTypingSentRef.current >= 3000) {
      lastTypingSentRef.current = now;
      onTyping?.(activeChannelId);
    }
  }, [activeChannelId, onTyping]);

  const sendMessage = useCallback(async () => {
    if (!activeChannelId || !orgId || !accessToken || !content.trim() || isSending) return;

    const trimmed = content.trim();
    setContent("");
    setIsSending(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
      const res = await fetch(
        `${apiUrl}/api/v1/orgs/${orgId}/channels/${activeChannelId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ content: trimmed }),
        }
      );

      if (!res.ok) {
        // Restore the message if send failed
        setContent(trimmed);
        throw new Error("Failed to send message");
      }
    } catch (err) {
      console.error("[MessageComposer] send error:", err);
    } finally {
      setIsSending(false);
    }
  }, [activeChannelId, orgId, accessToken, content, isSending]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setContent(e.target.value);
      handleTyping();
    },
    [handleTyping]
  );

  if (!activeChannelId) return null;

  return (
    <div className="border-t border-border-subtle px-4 py-3">
      <div className="flex items-end gap-2 rounded-lg border border-border-subtle bg-surface-secondary px-3 py-2">
        <textarea
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={t("typeMessage")}
          disabled={isSending}
          rows={1}
          className={[
            "max-h-40 flex-1 resize-none bg-transparent text-sm text-text-primary placeholder:text-text-secondary",
            "focus:outline-none disabled:opacity-50",
            "scrollbar-thin overflow-y-auto",
          ].join(" ")}
          style={{ lineHeight: "1.5" }}
        />
        <Button
          onClick={sendMessage}
          disabled={!content.trim() || isSending}
          size="icon-sm"
          className="shrink-0"
          title={t("send")}
        >
          <SendIcon />
        </Button>
      </div>
      <p className="mt-1 text-xs text-text-secondary">
        <kbd className="rounded bg-surface-secondary px-1 py-0.5 text-[10px] font-mono">Enter</kbd>{" "}
        to send,{" "}
        <kbd className="rounded bg-surface-secondary px-1 py-0.5 text-[10px] font-mono">Shift+Enter</kbd>{" "}
        for new line
      </p>
    </div>
  );
}
