import { create } from "zustand";
import type { Channel, Message } from "@ollo-dev/shared/types";

interface ChatState {
  channels: Channel[];
  activeChannelId: string | null;
  messages: Message[];
  typingUsers: Record<string, string[]>; // channelId -> userIds
  onlineUsers: string[];
  setChannels: (channels: Channel[]) => void;
  setActiveChannel: (channelId: string | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  removeMessage: (messageId: string) => void;
  setTypingUsers: (channelId: string, userIds: string[]) => void;
  setOnlineUsers: (userIds: string[]) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  channels: [],
  activeChannelId: null,
  messages: [],
  typingUsers: {},
  onlineUsers: [],

  setChannels: (channels) => set({ channels }),

  setActiveChannel: (channelId) =>
    set({ activeChannelId: channelId, messages: [] }),

  setMessages: (messages) => set({ messages }),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  updateMessage: (messageId, updates) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      ),
    })),

  removeMessage: (messageId) =>
    set((state) => ({
      messages: state.messages.filter((msg) => msg.id !== messageId),
    })),

  setTypingUsers: (channelId, userIds) =>
    set((state) => ({
      typingUsers: { ...state.typingUsers, [channelId]: userIds },
    })),

  setOnlineUsers: (userIds) => set({ onlineUsers: userIds }),
}));
