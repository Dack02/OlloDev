"use client";

import { useEffect } from "react";
import { ChannelList } from "@/components/chat/channel-list";
import { ChannelHeader } from "@/components/chat/channel-header";
import { MessageFeed } from "@/components/chat/message-feed";
import { MessageComposer } from "@/components/chat/message-composer";
import { useRealtimeChat } from "@/hooks/useRealtimeChat";
import { useChatStore } from "@/stores/chat-store";

export default function ChatPage() {
  const { activeChannelId } = useChatStore();
  const { sendTypingIndicator, trackPresence } = useRealtimeChat(activeChannelId);

  useEffect(() => {
    if (!activeChannelId) return;
    trackPresence("current_user_id");
  }, [activeChannelId, trackPresence]);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Channel list — left sidebar */}
      <aside className="w-[240px] shrink-0 border-r border-border-subtle bg-surface-secondary/50 overflow-hidden flex flex-col">
        <ChannelList />
      </aside>

      {/* Main chat area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <ChannelHeader />
        <MessageFeed />
        <MessageComposer onTyping={sendTypingIndicator} />
      </div>

      {/* Thread panel — future */}
      {/* <aside className="w-[360px] shrink-0 border-l border-border-subtle overflow-hidden flex flex-col" /> */}
    </div>
  );
}
