"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useState } from "react";
import {
  MessageCircleIcon,
  MessagesSquareIcon,
  BookOpenIcon,
  TicketIcon,
  BarChart3Icon,
  SettingsIcon,
  FolderIcon,
  PlusIcon,
  SearchIcon,
  ChevronDownIcon,
  HashIcon,
} from "lucide-react";

interface NavItem {
  key: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const mainNavItems: NavItem[] = [
  { key: "chat", href: "/chat", icon: MessageCircleIcon },
  { key: "threads", href: "/threads", icon: MessagesSquareIcon },
  { key: "wiki", href: "/wiki", icon: BookOpenIcon },
  { key: "tickets", href: "/tickets", icon: TicketIcon },
];

const bottomNavItems: NavItem[] = [
  { key: "admin", href: "/admin", icon: BarChart3Icon },
  { key: "settings", href: "/settings", icon: SettingsIcon },
];

// Mock projects — will come from store/API
const mockProjects = [
  { id: "1", name: "Auth Redesign", color: "#3b82f6", status: "active" },
  { id: "2", name: "API v2 Migration", color: "#22c55e", status: "active" },
  { id: "3", name: "Helpdesk Launch", color: "#f59e0b", status: "planning" },
];

export function Sidebar() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const [projectsExpanded, setProjectsExpanded] = useState(true);

  return (
    <aside className="flex h-full w-[260px] flex-col bg-surface-secondary border-r border-border-subtle">
      {/* Header — org name + search */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-[15px] font-semibold text-text-primary tracking-tight">
          Ollo Dev
        </span>
        <button
          className="p-1.5 rounded-radius-sm text-text-tertiary hover:text-text-secondary hover:bg-surface-tertiary/60 transition-colors"
          aria-label="Search"
        >
          <SearchIcon className="size-4" />
        </button>
      </div>

      {/* Main navigation */}
      <nav className="px-2 space-y-0.5">
        {mainNavItems.map((item) => {
          const isActive = pathname.includes(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={`/${locale}${item.href}`}
              className={`group flex items-center gap-2.5 rounded-radius-sm px-2.5 py-[7px] text-[13px] font-medium transition-all duration-[120ms] ${
                isActive
                  ? "bg-surface-tertiary/80 text-text-primary"
                  : "text-text-secondary hover:bg-surface-tertiary/50 hover:text-text-primary"
              }`}
            >
              <Icon className={`size-[16px] shrink-0 ${isActive ? "text-text-primary" : "text-text-tertiary group-hover:text-text-secondary"}`} />
              {t(item.key)}
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="mx-4 my-3 h-px bg-border-subtle" />

      {/* Projects section */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 mb-1">
          <button
            onClick={() => setProjectsExpanded(!projectsExpanded)}
            className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary hover:text-text-secondary transition-colors"
          >
            <ChevronDownIcon
              className={`size-3 transition-transform duration-200 ${
                projectsExpanded ? "" : "-rotate-90"
              }`}
            />
            Projects
          </button>
          <button
            className="p-1 rounded-md text-text-tertiary hover:text-text-secondary hover:bg-surface-tertiary/60 transition-colors"
            aria-label="New project"
          >
            <PlusIcon className="size-3.5" />
          </button>
        </div>

        {projectsExpanded && (
          <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
            {mockProjects.map((project) => {
              const isActive = pathname.includes(`/projects/${project.id}`);
              return (
                <Link
                  key={project.id}
                  href={`/${locale}/projects/${project.id}`}
                  className={`group flex items-center gap-2.5 rounded-radius-sm px-2.5 py-[7px] text-[13px] transition-all duration-[120ms] ${
                    isActive
                      ? "bg-surface-tertiary/80 text-text-primary"
                      : "text-text-secondary hover:bg-surface-tertiary/50 hover:text-text-primary"
                  }`}
                >
                  <span
                    className="size-2 rounded-full shrink-0"
                    style={{ backgroundColor: project.color }}
                  />
                  <span className="truncate font-medium">{project.name}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div className="px-2 pb-2 space-y-0.5">
        <div className="mx-2 mb-2 h-px bg-border-subtle" />
        {bottomNavItems.map((item) => {
          const isActive = pathname.includes(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={`/${locale}${item.href}`}
              className={`group flex items-center gap-2.5 rounded-radius-sm px-2.5 py-[7px] text-[13px] font-medium transition-all duration-[120ms] ${
                isActive
                  ? "bg-surface-tertiary/80 text-text-primary"
                  : "text-text-secondary hover:bg-surface-tertiary/50 hover:text-text-primary"
              }`}
            >
              <Icon className={`size-[16px] shrink-0 ${isActive ? "text-text-primary" : "text-text-tertiary group-hover:text-text-secondary"}`} />
              {t(item.key)}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
