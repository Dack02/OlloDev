"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ChevronDownIcon } from "lucide-react";

/* ================================================================
   FilterBar — underline-tab sub-navigation with optional dropdowns.

   Compose freely:

     <FilterBar>
       <FilterBar.Tabs items={[...]} value={v} onChange={setV} />
       <FilterBar.Actions>
         <FilterBar.Select ... />
       </FilterBar.Actions>
     </FilterBar>
   ================================================================ */

// ── Root container ──────────────────────────────────────────────

interface FilterBarProps {
  children: ReactNode;
  className?: string;
}

function FilterBarRoot({ children, className }: FilterBarProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between border-b border-border-subtle shrink-0 overflow-x-auto scrollbar-hide",
        className
      )}
    >
      {children}
    </div>
  );
}

// ── Tabs (underline style) ──────────────────────────────────────

interface TabItem {
  value: string;
  label: string;
  count?: number;
  dot?: string;      // color string for a category dot
}

interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

function Tabs({ items, value, onChange, className }: TabsProps) {
  return (
    <div className={cn("flex items-center gap-0.5 pl-2 min-w-max", className)}>
      {items.map((item) => {
        const isActive = item.value === value;
        return (
          <button
            key={item.value}
            onClick={() => onChange(item.value)}
            className={cn(
              "group relative flex items-center gap-1.5 px-3 py-2.5 text-[13px] font-medium transition-colors duration-150",
              isActive
                ? "text-text-primary"
                : "text-text-tertiary hover:text-text-secondary"
            )}
          >
            {/* Category dot */}
            {item.dot && (
              <span
                className={cn(
                  "size-[6px] rounded-full shrink-0 transition-opacity duration-150",
                  isActive ? "opacity-100" : "opacity-40 group-hover:opacity-60"
                )}
                style={{ backgroundColor: item.dot }}
              />
            )}

            {item.label}

            {/* Count chip */}
            {item.count !== undefined && (
              <span
                className={cn(
                  "text-[11px] font-medium tabular-nums min-w-[18px] text-center rounded-full px-1.5 py-px transition-colors duration-150",
                  isActive
                    ? "bg-text-primary/[0.07] text-text-primary"
                    : "bg-surface-tertiary/60 text-text-tertiary"
                )}
              >
                {item.count}
              </span>
            )}

            {/* Active underline */}
            <span
              className={cn(
                "absolute bottom-0 left-3 right-3 h-[2px] rounded-full transition-all duration-200",
                isActive
                  ? item.dot ? "" : "bg-text-primary"
                  : "bg-transparent"
              )}
              style={isActive && item.dot ? { backgroundColor: item.dot } : undefined}
            />
          </button>
        );
      })}
    </div>
  );
}

// ── Actions (right-aligned slot) ────────────────────────────────

interface ActionsProps {
  children: ReactNode;
  className?: string;
}

function Actions({ children, className }: ActionsProps) {
  return (
    <div className={cn("flex items-center gap-1.5 pr-3", className)}>
      {children}
    </div>
  );
}

// ── Select (dropdown filter) ────────────────────────────────────

interface SelectItem {
  value: string;
  label: string;
}

interface SelectProps {
  items: SelectItem[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

function Select({ items, value, onChange, placeholder = "Filter", className }: SelectProps) {
  return (
    <div className={cn("relative", className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "appearance-none cursor-pointer rounded-md pl-2.5 pr-7 py-[5px] text-[12px] font-medium transition-all duration-150",
          "border border-border-subtle bg-transparent",
          "hover:bg-surface-tertiary/50 hover:border-border-strong",
          "focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent/40",
          value
            ? "text-text-primary"
            : "text-text-tertiary"
        )}
      >
        <option value="">{placeholder}</option>
        {items.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 size-3 text-text-tertiary pointer-events-none" />
    </div>
  );
}

// ── Separator ───────────────────────────────────────────────────

function Separator() {
  return <div className="h-4 w-px bg-border-subtle mx-1" />;
}

// ── Compose ─────────────────────────────────────────────────────

export const FilterBar = Object.assign(FilterBarRoot, {
  Tabs,
  Actions,
  Select,
  Separator,
});
