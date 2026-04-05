"use client";

import { useEffect, useState } from "react";
import { ChannelList } from "@/components/chat/channel-list";
import { ChannelHeader } from "@/components/chat/channel-header";
import { MessageFeed } from "@/components/chat/message-feed";
import { MessageComposer } from "@/components/chat/message-composer";
import { useRealtimeChat } from "@/hooks/useRealtimeChat";
import { useChatStore } from "@/stores/chat-store";
import { ArrowLeftIcon } from "lucide-react";

export default function ChatPage() {
  const { activeChannelId, setActiveChannel } = useChatStore();
  const { sendTypingIndicator, trackPresence } = useRealtimeChat(activeChannelId);
  const [showChannelList, setShowChannelList] = useState(!activeChannelId);

  useEffect(() => {
    if (!activeChannelId) return;
    trackPresence("current_user_id");
  }, [activeChannelId, trackPresence]);

  // On mobile, when a channel is selected, show the chat
  useEffect(() => {
    if (activeChannelId) setShowChannelList(false);
  }, [activeChannelId]);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Channel list — always visible on desktop, toggleable on mobile */}
      <aside className={`${
        showChannelList ? "flex" : "hidden"
      } md:flex w-full md:w-[240px] shrink-0 border-r border-border-subtle bg-surface-secondary/50 overflow-hidden flex-col`}>
        <ChannelList />
      </aside>

      {/* Main chat area — always visible on desktop, toggleable on mobile */}
      <div className={`${
        showChannelList ? "hidden" : "flex"
      } md:flex flex-1 flex-col overflow-hidden`}>
        {/* Mobile back button */}
        <div className="md:hidden flex items-center gap-2 px-3 py-2 border-b border-border-subtle">
          <button
            onClick={() => {
              setShowChannelList(true);
              setActiveChannel(null);
            }}
            className="p-1.5 rounded-radius-sm text-text-tertiary hover:text-text-secondary hover:bg-surface-tertiary/50 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Back to channels"
          >
            <ArrowLeftIcon className="size-5" />
          </button>
          <span className="text-[13px] font-medium text-text-secondary">Channels</span>
        </div>
        <ChannelHeader />
        <MessageFeed />
        <MessageComposer onTyping={sendTypingIndicator} />
      </div>
    </div>
  );
}
