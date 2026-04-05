"use client";

import { useState, useRef, useEffect } from "react";
import { useTheme } from "next-themes";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { SunIcon, MoonIcon, LogOutIcon, SettingsIcon } from "lucide-react";
import { NotificationBell } from "@/components/layout/notification-panel";
import { TimerWidget } from "@/components/projects/timer-widget";

export function Header() {
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const locale = useLocale();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const displayName =
    user?.user_metadata?.display_name ?? user?.email ?? "";
  const initial = displayName ? displayName.charAt(0).toUpperCase() : "?";

  // Close menu on click outside
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  async function handleSignOut() {
    setMenuOpen(false);
    await signOut();
    router.push(`/${locale}/login`);
  }

  return (
    <header className="flex h-12 items-center justify-between border-b border-border-subtle px-5 shrink-0">
      {/* Left: timer widget */}
      <div>
        <TimerWidget />
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 rounded-radius-sm text-text-tertiary hover:text-text-secondary hover:bg-surface-tertiary/50 transition-colors"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <SunIcon className="size-4" />
          ) : (
            <MoonIcon className="size-4" />
          )}
        </button>

        <NotificationBell />

        {/* User menu */}
        <div className="relative ml-1.5" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 rounded-radius-sm p-0.5 hover:bg-surface-tertiary/50 transition-colors"
            aria-label="User menu"
          >
            <div className="size-7 rounded-full bg-accent-muted flex items-center justify-center text-[11px] font-semibold text-accent">
              {initial}
            </div>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-56 rounded-radius-md border border-border-default bg-surface-primary shadow-lg z-50 overflow-hidden">
              <div className="px-3 py-2.5 border-b border-border-subtle">
                <p className="text-sm font-medium text-text-primary truncate">
                  {displayName}
                </p>
                {user?.email && displayName !== user.email && (
                  <p className="text-xs text-text-tertiary truncate mt-0.5">
                    {user.email}
                  </p>
                )}
              </div>

              <div className="py-1">
                <Link
                  href={`/${locale}/settings`}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-text-secondary hover:bg-surface-tertiary/50 hover:text-text-primary transition-colors"
                >
                  <SettingsIcon className="size-4" />
                  Settings
                </Link>

                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-text-secondary hover:bg-surface-tertiary/50 hover:text-text-primary transition-colors"
                >
                  <LogOutIcon className="size-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
