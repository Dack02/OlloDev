import { create } from "zustand";

export type NotificationType = "success" | "error" | "warning" | "info";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  timestamp: number;
  read: boolean;
}

interface NotificationState {
  notifications: Notification[];
  add: (notification: Omit<Notification, "id" | "timestamp" | "read">) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  remove: (id: string) => void;
  clear: () => void;
  unreadCount: () => number;
}

let counter = 0;

export const useNotificationStore = create<NotificationState>()((set, get) => ({
  notifications: [],

  add: (notification) => {
    const entry: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${++counter}`,
      timestamp: Date.now(),
      read: false,
    };
    set((state) => ({
      notifications: [entry, ...state.notifications].slice(0, 100),
    }));
  },

  markRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    })),

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    })),

  remove: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  clear: () => set({ notifications: [] }),

  unreadCount: () => get().notifications.filter((n) => !n.read).length,
}));
