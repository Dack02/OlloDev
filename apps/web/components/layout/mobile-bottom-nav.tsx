"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import {
  MessagesSquareIcon,
  MessageCircleIcon,
  BookOpenIcon,
  TicketIcon,
  FolderIcon,
} from "lucide-react";

const items = [
  { key: "threads", href: "/threads", icon: MessagesSquareIcon, label: "Threads" },
  { key: "chat", href: "/chat", icon: MessageCircleIcon, label: "Chat" },
  { key: "wiki", href: "/wiki", icon: BookOpenIcon, label: "Wiki" },
  { key: "tickets", href: "/tickets", icon: TicketIcon, label: "Tickets" },
  { key: "projects", href: "/projects", icon: FolderIcon, label: "Projects" },
];

export function MobileBottomNav() {
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-border-subtle bg-surface-primary/95 backdrop-blur-sm"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {items.map((item) => {
        const isActive = pathname.includes(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.key}
            href={`/${locale}${item.href}`}
            className={`flex flex-col items-center gap-0.5 py-2 px-3 min-h-[44px] min-w-[44px] transition-colors ${
              isActive
                ? "text-accent"
                : "text-text-tertiary"
            }`}
          >
            <Icon className="size-5" />
            <span className="text-[10px] font-medium leading-tight">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
