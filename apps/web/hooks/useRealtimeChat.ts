"use client";

import { useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useChatStore } from "@/stores/chat-store";
import type { Message } from "@ollo-dev/shared/types";

let typingTimeout: ReturnType<typeof setTimeout> | null = null;

export function useRealtimeChat(channelId: string | null) {
  const { addMessage, updateMessage, removeMessage, setTypingUsers, setOnlineUsers } =
    useChatStore();

  useEffect(() => {
    if (!channelId) return;

    const supabase = createClient();

    // Channel for postgres changes (messages) + broadcast (typing)
    const channel = supabase.channel(`chat:${channelId}`, {
      config: {
        broadcast: { self: false },
        presence: { key: "online_users" },
      },
    });

    // Subscribe to message INSERT/UPDATE/DELETE
    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `channel_id=eq.${channelId}`,
      },
      (payload) => {
        addMessage(payload.new as Message);
      }
    );

    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "messages",
        filter: `channel_id=eq.${channelId}`,
      },
      (payload) => {
        updateMessage(payload.new.id as string, payload.new as Partial<Message>);
      }
    );

    channel.on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "messages",
        filter: `channel_id=eq.${channelId}`,
      },
      (payload) => {
        removeMessage(payload.old.id as string);
      }
    );

    // Subscribe to typing broadcast events
    channel.on("broadcast", { event: "typing" }, (payload) => {
      const { channel_id, user_ids } = payload.payload as {
        channel_id: string;
        user_ids: string[];
      };
      setTypingUsers(channel_id, user_ids);
    });

    // Subscribe to presence for online users
    channel.on("presence", { event: "sync" }, () => {
      const presenceState = channel.presenceState<{ userId: string }>();
      const userIds = Object.values(presenceState)
        .flat()
        .map((p) => p.userId)
        .filter(Boolean);
      setOnlineUsers(userIds);
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, addMessage, updateMessage, removeMessage, setTypingUsers, setOnlineUsers]);

  const sendTypingIndicator = useCallback(
    (targetChannelId: string) => {
      if (!targetChannelId) return;

      const supabase = createClient();
      const channel = supabase.channel(`chat:${targetChannelId}`);

      // Debounce: only send every 3 seconds
      if (typingTimeout) return;

      channel.send({
        type: "broadcast",
        event: "typing",
        payload: { channel_id: targetChannelId },
      });

      typingTimeout = setTimeout(() => {
        typingTimeout = null;
      }, 3000);
    },
    []
  );

  const trackPresence = useCallback(async (userId: string) => {
    if (!channelId || !userId) return;

    const supabase = createClient();
    const channel = supabase.channel(`chat:${channelId}`);
    await channel.track({ userId });
  }, [channelId]);

  return { sendTypingIndicator, trackPresence };
}
