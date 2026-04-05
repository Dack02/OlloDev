"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useState, useRef, useCallback, useEffect } from "react";
import {
  MessageCircleIcon,
  MessagesSquareIcon,
  BookOpenIcon,
  TicketIcon,
  BarChart3Icon,
  UsersIcon,
  SettingsIcon,
  CodeIcon,
  PlusIcon,
  SearchIcon,
  ChevronDownIcon,
  PanelLeftCloseIcon,
  PanelLeftIcon,
  Columns2Icon,
} from "lucide-react";
import {
  useSidebarStore,
  getIsExpanded,
  type SidebarMode,
} from "@/stores/sidebar-store";
import { useProjectStore } from "@/stores/project-store";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { useAuth } from "@/lib/auth-context";
import { useMobileSidebar } from "@/hooks/useMobileSidebar";

interface NavItem {
  key: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const mainNavItems: NavItem[] = [
  { key: "threads", href: "/threads", icon: MessagesSquareIcon },
  { key: "chat", href: "/chat", icon: MessageCircleIcon },
  { key: "wiki", href: "/wiki", icon: BookOpenIcon },
  { key: "tickets", href: "/tickets", icon: TicketIcon },
];

const bottomNavItems: NavItem[] = [
  { key: "apiDocs", href: "/api-docs", icon: CodeIcon },
  { key: "members", href: "/admin/members", icon: UsersIcon },
  { key: "admin", href: "/admin", icon: BarChart3Icon },
  { key: "settings", href: "/settings", icon: SettingsIcon },
];

const MODE_CYCLE: SidebarMode[] = ["open", "collapsed", "auto"];

function getModeIcon(mode: SidebarMode) {
  switch (mode) {
    case "open":
      return PanelLeftCloseIcon;
    case "collapsed":
      return PanelLeftIcon;
    case "auto":
      return Columns2Icon;
  }
}

function getModeLabel(mode: SidebarMode) {
  switch (mode) {
    case "open":
      return "Always open";
    case "collapsed":
      return "Collapsed";
    case "auto":
      return "Auto-collapse";
  }
}

function SidebarContent({ expanded, onLinkClick }: { expanded: boolean; onLinkClick?: () => void }) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const { projects, setProjects } = useProjectStore();
  const { org, accessToken, loading } = useAuth();
  const orgId = org?.id;
  const { mode, setMode } = useSidebarStore();

  useEffect(() => {
    if (loading || !orgId || !accessToken) return;

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/projects?limit=100`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to fetch projects: ${r.status}`);
        return r.json();
      })
      .then((json) => {
        if (json?.data) setProjects(json.data);
      })
      .catch((err) => console.error("[Sidebar] project fetch error", err));
  }, [loading, orgId, accessToken, setProjects]);

  const cycleMode = () => {
    const idx = MODE_CYCLE.indexOf(mode);
    setMode(MODE_CYCLE[(idx + 1) % MODE_CYCLE.length]);
  };

  const ModeIcon = getModeIcon(mode);

  return (
    <>
      {/* Header — org name + search */}
      <div
        className="flex items-center justify-between px-3 py-3"
        style={{ backgroundColor: "var(--sidebar-header-bg)" }}
      >
        {expanded ? (
          <>
            <span className="text-[15px] font-semibold text-text-primary tracking-tight whitespace-nowrap overflow-hidden">
              Ollo Dev
            </span>
            <button
              className="p-1.5 rounded-radius-sm text-text-tertiary hover:text-accent hover:bg-accent-muted transition-colors"
              aria-label="Search"
            >
              <SearchIcon className="size-4" />
            </button>
          </>
        ) : (
          <button
            className="mx-auto p-1.5 rounded-radius-sm text-text-tertiary hover:text-accent hover:bg-accent-muted transition-colors"
            aria-label="Search"
          >
            <SearchIcon className="size-4" />
          </button>
        )}
      </div>

      {/* Main navigation */}
      <nav className="px-2 mt-1 space-y-0.5">
        {mainNavItems.map((item) => {
          const isActive = pathname.includes(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={`/${locale}${item.href}`}
              title={expanded ? undefined : t(item.key)}
              onClick={onLinkClick}
              className={`group relative flex items-center rounded-radius-sm text-[13px] font-medium transition-all duration-[120ms] ${
                expanded
                  ? "gap-2.5 px-2.5 py-[7px]"
                  : "justify-center px-0 py-[7px]"
              } ${
                isActive
                  ? "bg-accent-muted text-accent"
                  : "text-text-secondary hover:bg-surface-tertiary/50 hover:text-text-primary"
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-accent" />
              )}
              <Icon
                className={`size-[16px] shrink-0 ${
                  isActive
                    ? "text-accent"
                    : "text-text-tertiary group-hover:text-accent/60"
                }`}
              />
              {expanded && (
                <span className="whitespace-nowrap overflow-hidden">
                  {t(item.key)}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="mx-4 my-3 h-px bg-border-subtle" />

      {/* Projects section — hidden when collapsed */}
      {expanded && (
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 mb-1">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setProjectsExpanded(!projectsExpanded)}
                className="rounded-sm p-0.5 text-text-tertiary hover:text-text-secondary transition-colors"
                aria-label={projectsExpanded ? "Collapse projects" : "Expand projects"}
              >
                <ChevronDownIcon
                  className={`size-3 transition-transform duration-200 ${
                    projectsExpanded ? "" : "-rotate-90"
                  }`}
                />
              </button>
              <Link
                href={`/${locale}/projects`}
                onClick={onLinkClick}
                className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary hover:text-text-secondary transition-colors"
              >
                {t("projects")}
              </Link>
            </div>
            <CreateProjectDialog
              trigger={
                <button
                  className="p-1 rounded-md text-text-tertiary hover:text-accent hover:bg-accent-muted transition-colors"
                  aria-label="New project"
                >
                  <PlusIcon className="size-3.5" />
                </button>
              }
            />
          </div>

          {projectsExpanded && (
            <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
              {projects.map((project) => {
                const isActive = pathname.includes(
                  `/projects/${project.id}`
                );
                return (
                  <Link
                    key={project.id}
                    href={`/${locale}/projects/${project.id}`}
                    onClick={onLinkClick}
                    className={`group relative flex items-center gap-2.5 rounded-radius-sm px-2.5 py-[7px] text-[13px] transition-all duration-[120ms] ${
                      isActive
                        ? "bg-accent-muted text-accent"
                        : "text-text-secondary hover:bg-surface-tertiary/50 hover:text-text-primary"
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-accent" />
                    )}
                    <span
                      className="size-2.5 rounded-full shrink-0 transition-shadow duration-150 group-hover:shadow-[0_0_0_2px_var(--surface-secondary),0_0_0_3.5px_var(--border-default)]"
                      style={{ backgroundColor: project.color }}
                    />
                    <span className="truncate font-medium">
                      {project.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Spacer when collapsed (no projects shown) */}
      {!expanded && <div className="flex-1" />}

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
              title={expanded ? undefined : t(item.key)}
              onClick={onLinkClick}
              className={`group relative flex items-center rounded-radius-sm text-[13px] font-medium transition-all duration-[120ms] ${
                expanded
                  ? "gap-2.5 px-2.5 py-[7px]"
                  : "justify-center px-0 py-[7px]"
              } ${
                isActive
                  ? "bg-accent-muted text-accent"
                  : "text-text-secondary hover:bg-surface-tertiary/50 hover:text-text-primary"
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-accent" />
              )}
              <Icon
                className={`size-[16px] shrink-0 ${
                  isActive
                    ? "text-accent"
                    : "text-text-tertiary group-hover:text-accent/60"
                }`}
              />
              {expanded && (
                <span className="whitespace-nowrap overflow-hidden">
                  {t(item.key)}
                </span>
              )}
            </Link>
          );
        })}

        {/* Mode toggle — hidden on mobile (no need for sidebar modes) */}
        <button
          onClick={cycleMode}
          title={getModeLabel(mode)}
          className={`hidden md:flex group items-center rounded-radius-sm text-[13px] font-medium text-text-tertiary hover:text-accent hover:bg-accent-muted transition-all duration-[120ms] w-full ${
            expanded
              ? "gap-2.5 px-2.5 py-[7px]"
              : "justify-center px-0 py-[7px]"
          }`}
        >
          <ModeIcon className="size-[16px] shrink-0" />
          {expanded && (
            <span className="whitespace-nowrap overflow-hidden">
              {getModeLabel(mode)}
            </span>
          )}
        </button>
      </div>
    </>
  );
}

export function Sidebar() {
  const { mode, isHovered, setHovered } = useSidebarStore();
  const expanded = getIsExpanded(mode, isHovered);
  const { isOpen, close } = useMobileSidebar();

  // Debounced mouse-leave for auto mode
  const leaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (leaveTimeout.current) {
      clearTimeout(leaveTimeout.current);
      leaveTimeout.current = null;
    }
    setHovered(true);
  }, [setHovered]);

  const handleMouseLeave = useCallback(() => {
    leaveTimeout.current = setTimeout(() => {
      setHovered(false);
    }, 150);
  }, [setHovered]);

  useEffect(() => {
    return () => {
      if (leaveTimeout.current) clearTimeout(leaveTimeout.current);
    };
  }, []);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex h-full flex-col bg-surface-secondary border-r border-border-subtle transition-[width] duration-200 ${
          expanded ? "w-[220px]" : "w-[52px]"
        }`}
        style={{ transitionTimingFunction: "var(--ease-default)" }}
        onMouseEnter={mode === "auto" ? handleMouseEnter : undefined}
        onMouseLeave={mode === "auto" ? handleMouseLeave : undefined}
      >
        <SidebarContent expanded={expanded} />
      </aside>

      {/* Mobile sidebar — slide-over drawer */}
      {/* Backdrop */}
      <div
        className={`md:hidden fixed inset-0 z-40 bg-black/30 transition-opacity duration-200 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={close}
        aria-hidden="true"
      />
      {/* Drawer */}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-[220px] flex flex-col bg-surface-secondary transform transition-transform duration-200 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ transitionTimingFunction: "var(--ease-default)" }}
      >
        <SidebarContent expanded={true} onLinkClick={close} />
      </aside>
    </>
  );
}
