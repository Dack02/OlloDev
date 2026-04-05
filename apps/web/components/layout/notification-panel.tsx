"use client";

import { useRef, useEffect } from "react";
import {
  BellIcon,
  CheckCheckIcon,
  Trash2Icon,
  XIcon,
  CheckCircle2Icon,
  XCircleIcon,
  AlertTriangleIcon,
  InfoIcon,
} from "lucide-react";
import {
  useNotificationStore,
  type NotificationType,
} from "@/stores/notification-store";

const typeConfig: Record<
  NotificationType,
  { icon: typeof InfoIcon; colorClass: string }
> = {
  success: { icon: CheckCircle2Icon, colorClass: "text-success" },
  error: { icon: XCircleIcon, colorClass: "text-error" },
  warning: { icon: AlertTriangleIcon, colorClass: "text-warning" },
  info: { icon: InfoIcon, colorClass: "text-info" },
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationBell() {
  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount = useNotificationStore((s) => s.unreadCount());
  const { markRead, markAllRead, clear } = useNotificationStore();
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        panelRef.current.classList.add("hidden");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const toggle = () => {
    panelRef.current?.classList.toggle("hidden");
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={toggle}
        className="p-2 rounded-radius-sm text-text-tertiary hover:text-text-secondary hover:bg-surface-tertiary/50 transition-colors relative"
        aria-label="Notifications"
      >
        <BellIcon className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 size-2 rounded-full bg-error ring-2 ring-surface-primary" />
        )}
      </button>

      <div
        ref={panelRef}
        className="hidden absolute right-0 top-full mt-1.5 w-[360px] max-h-[480px] flex flex-col rounded-radius-md bg-surface-elevated border border-border-default shadow-lg z-50 overflow-hidden"
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
          <span className="text-[13px] font-semibold text-text-primary">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-error text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </span>
          <div className="flex items-center gap-1">
            {notifications.length > 0 && (
              <>
                <button
                  onClick={markAllRead}
                  title="Mark all read"
                  className="p-1.5 rounded-radius-sm text-text-tertiary hover:text-accent hover:bg-accent-muted transition-colors"
                >
                  <CheckCheckIcon className="size-3.5" />
                </button>
                <button
                  onClick={clear}
                  title="Clear all"
                  className="p-1.5 rounded-radius-sm text-text-tertiary hover:text-error hover:bg-error-muted transition-colors"
                >
                  <Trash2Icon className="size-3.5" />
                </button>
              </>
            )}
            <button
              onClick={toggle}
              className="p-1.5 rounded-radius-sm text-text-tertiary hover:text-text-secondary hover:bg-surface-tertiary/50 transition-colors"
            >
              <XIcon className="size-3.5" />
            </button>
          </div>
        </div>

        {/* Notification list */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-text-tertiary">
              <BellIcon className="size-8 mb-2 opacity-40" />
              <span className="text-[13px]">No notifications</span>
            </div>
          ) : (
            notifications.map((n) => {
              const config = typeConfig[n.type];
              const Icon = config.icon;
              return (
                <button
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-tertiary/30 border-b border-border-subtle last:border-b-0 ${
                    n.read ? "opacity-60" : ""
                  }`}
                >
                  <Icon
                    className={`size-4 mt-0.5 shrink-0 ${config.colorClass}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-text-primary truncate">
                        {n.title}
                      </span>
                      {!n.read && (
                        <span className="size-1.5 rounded-full bg-accent shrink-0" />
                      )}
                    </div>
                    {n.message && (
                      <p className="text-[12px] text-text-secondary mt-0.5 line-clamp-2">
                        {n.message}
                      </p>
                    )}
                    <span className="text-[11px] text-text-tertiary mt-1 block">
                      {timeAgo(n.timestamp)}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
