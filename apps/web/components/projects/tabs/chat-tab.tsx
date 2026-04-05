"use client";

import { useState, useRef, useEffect } from "react";
import { useProjectStore, type ProjectMessage } from "@/stores/project-store";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { SendIcon, MessageCircleIcon } from "lucide-react";

function MessageBubble({
  message,
  isGrouped,
}: {
  message: ProjectMessage;
  isGrouped: boolean;
}) {
  const isOwn = message.author_id === "user_1";

  return (
    <div className={cn("px-5", isGrouped ? "mt-0.5" : "mt-4")}>
      {!isGrouped && (
        <div className="flex items-center gap-2 mb-1">
          <span
            className={cn(
              "size-6 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0",
              isOwn
                ? "bg-accent-muted text-accent"
                : "bg-surface-tertiary text-text-secondary"
            )}
          >
            {message.author_name.charAt(0).toUpperCase()}
          </span>
          <span className="text-[12px] font-semibold text-text-primary">
            {message.author_name}
          </span>
          <span className="text-[11px] text-text-tertiary">
            {new Date(message.created_at).toLocaleTimeString("en", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        </div>
      )}
      <div className={cn(!isGrouped ? "pl-8" : "pl-8")}>
        <p className="text-[13px] text-text-primary leading-relaxed">
          {message.body}
        </p>
      </div>
    </div>
  );
}

interface ChatTabProps {
  projectId: string;
}

export function ChatTab({ projectId }: ChatTabProps) {
  const { messages, addMessage, setMessages, markChatRead } = useProjectStore();
  const { org, accessToken, user } = useAuth();
  const orgId = org?.id;
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const projectMessages = messages.filter((m) => m.project_id === projectId);

  // Load messages from API on mount
  useEffect(() => {
    async function loadMessages() {
      if (!orgId || !accessToken) return;
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/projects/${projectId}/messages?limit=100`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (res.ok) {
          const json = await res.json();
          // API returns newest first; reverse to show oldest first
          const apiMessages = (json.data ?? []).reverse();
          if (apiMessages.length > 0) {
            // Merge: keep any local-only messages, replace API ones
            const localOnly = messages.filter(
              (m) => m.project_id !== projectId
            );
            setMessages([...localOnly, ...apiMessages]);
          }
        }
      } catch {
        // Silently fall back to local store
      }
    }
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, accessToken, projectId]);

  // Mark as read when the tab is opened or new messages arrive
  useEffect(() => {
    markChatRead(projectId);
  }, [projectId, projectMessages.length, markChatRead]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [projectMessages.length]);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setInput("");

    try {
      if (orgId && accessToken) {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/projects/${projectId}/messages`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ body: trimmed }),
          }
        );
        if (res.ok) {
          const json = await res.json();
          addMessage(json.data);
        } else {
          throw new Error("Failed to send");
        }
      } else {
        // Fallback: add to local store
        addMessage({
          id: `m_${Date.now()}`,
          project_id: projectId,
          author_id: user?.id ?? "user_1",
          author_name: user?.user_metadata?.display_name ?? "Leo",
          body: trimmed,
          created_at: new Date().toISOString(),
        });
      }
    } catch {
      // Fallback on error
      addMessage({
        id: `m_${Date.now()}`,
        project_id: projectId,
        author_id: user?.id ?? "user_1",
        author_name: user?.user_metadata?.display_name ?? "Leo",
        body: trimmed,
        created_at: new Date().toISOString(),
      });
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {projectMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="size-10 rounded-xl bg-surface-secondary flex items-center justify-center mb-3">
              <MessageCircleIcon className="size-4 text-text-tertiary" />
            </div>
            <p className="text-[13px] text-text-secondary font-medium">
              No messages yet
            </p>
            <p className="text-[12px] text-text-tertiary mt-1">
              Start the conversation for this project
            </p>
          </div>
        ) : (
          <div className="py-3">
            {projectMessages.map((message, i) => {
              const prev = projectMessages[i - 1];
              const isGrouped =
                !!prev &&
                prev.author_id === message.author_id &&
                new Date(message.created_at).getTime() -
                  new Date(prev.created_at).getTime() <
                  5 * 60 * 1000;

              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isGrouped={isGrouped}
                />
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-border-subtle bg-surface-primary px-5 py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write a message..."
            rows={1}
            className="flex-1 resize-none rounded-radius-sm border border-border-subtle bg-surface-secondary px-3 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent/40 transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className={cn(
              "p-2 rounded-radius-sm transition-colors shrink-0",
              input.trim()
                ? "bg-accent text-white hover:bg-accent-hover"
                : "bg-surface-tertiary text-text-tertiary cursor-not-allowed"
            )}
            aria-label="Send message"
          >
            <SendIcon className="size-4" />
          </button>
        </div>
        <p className="text-[11px] text-text-tertiary mt-1.5">
          Press Enter to send, Shift + Enter for new line
        </p>
      </div>
    </div>
  );
}
