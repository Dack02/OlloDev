"use client";

import { useTheme } from "next-themes";
import { useAuth } from "@/lib/auth-context";
import { SunIcon, MoonIcon, BellIcon } from "lucide-react";

export function Header() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  const displayName =
    (user as unknown as Record<string, string> | null)?.display_name ??
    user?.email ??
    "";
  const initial = displayName ? displayName.charAt(0).toUpperCase() : "?";

  return (
    <header className="flex h-12 items-center justify-between border-b border-border-subtle px-5 shrink-0">
      {/* Left: breadcrumb / page title slot */}
      <div />

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

        <button
          className="p-2 rounded-radius-sm text-text-tertiary hover:text-text-secondary hover:bg-surface-tertiary/50 transition-colors"
          aria-label="Notifications"
        >
          <BellIcon className="size-4" />
        </button>

        <div className="ml-1.5 flex items-center gap-2">
          <div className="size-7 rounded-full bg-accent-muted flex items-center justify-center text-[11px] font-semibold text-accent">
            {initial}
          </div>
        </div>
      </div>
    </header>
  );
}
