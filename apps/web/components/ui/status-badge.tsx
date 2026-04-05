"use client";

import { cn } from "@/lib/utils";
import {
  CircleIcon,
  CircleDotIcon,
  ClockIcon,
  CheckCircle2Icon,
  XCircleIcon,
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  AlertCircleIcon,
} from "lucide-react";

/* ================================================================
   StatusBadge — a semantic badge for status & priority values.

   Uses design-token-friendly colors instead of raw Tailwind palette
   classes (no more bg-blue-100, bg-red-100, etc.)

   Usage:
     <StatusBadge kind="status" value="open" />
     <StatusBadge kind="priority" value="urgent" />
     <StatusBadge kind="category" value="bugs" label="Bugs" />
   ================================================================ */

type StatusValue = "open" | "pending" | "in_progress" | "resolved" | "closed" | "archived";
type PriorityValue = "low" | "normal" | "medium" | "high" | "urgent";
type CategoryValue = string;

interface StatusConfig {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  dot: string;   // dot / icon color
  bg: string;    // background
  text: string;  // text color
}

const STATUS_MAP: Record<StatusValue, StatusConfig> = {
  open: {
    label: "Open",
    icon: CircleIcon,
    dot: "text-[#3b82f6]",
    bg: "bg-[#3b82f6]/8",
    text: "text-[#3b82f6]",
  },
  pending: {
    label: "Pending",
    icon: ClockIcon,
    dot: "text-[#f59e0b]",
    bg: "bg-[#f59e0b]/8",
    text: "text-[#f59e0b]",
  },
  in_progress: {
    label: "In Progress",
    icon: CircleDotIcon,
    dot: "text-[#8b5cf6]",
    bg: "bg-[#8b5cf6]/8",
    text: "text-[#8b5cf6]",
  },
  resolved: {
    label: "Resolved",
    icon: CheckCircle2Icon,
    dot: "text-[#22c55e]",
    bg: "bg-[#22c55e]/8",
    text: "text-[#22c55e]",
  },
  closed: {
    label: "Closed",
    icon: XCircleIcon,
    dot: "text-text-tertiary",
    bg: "bg-surface-tertiary/60",
    text: "text-text-secondary",
  },
  archived: {
    label: "Archived",
    icon: XCircleIcon,
    dot: "text-text-tertiary",
    bg: "bg-surface-tertiary/60",
    text: "text-text-secondary",
  },
};

const PRIORITY_MAP: Record<PriorityValue, StatusConfig> = {
  low: {
    label: "Low",
    icon: ArrowDownIcon,
    dot: "text-text-tertiary",
    bg: "bg-surface-tertiary/60",
    text: "text-text-secondary",
  },
  normal: {
    label: "Normal",
    icon: ArrowRightIcon,
    dot: "text-[#3b82f6]",
    bg: "bg-[#3b82f6]/8",
    text: "text-[#3b82f6]",
  },
  medium: {
    label: "Medium",
    icon: ArrowRightIcon,
    dot: "text-[#3b82f6]",
    bg: "bg-[#3b82f6]/8",
    text: "text-[#3b82f6]",
  },
  high: {
    label: "High",
    icon: ArrowUpIcon,
    dot: "text-[#f59e0b]",
    bg: "bg-[#f59e0b]/8",
    text: "text-[#f59e0b]",
  },
  urgent: {
    label: "Urgent",
    icon: AlertCircleIcon,
    dot: "text-[#ef4444]",
    bg: "bg-[#ef4444]/8",
    text: "text-[#ef4444]",
  },
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  general:       { bg: "bg-[#3b82f6]/8",  text: "text-[#3b82f6]",  dot: "bg-[#3b82f6]" },
  ideas:         { bg: "bg-[#8b5cf6]/8",  text: "text-[#8b5cf6]",  dot: "bg-[#8b5cf6]" },
  bugs:          { bg: "bg-[#ef4444]/8",  text: "text-[#ef4444]",  dot: "bg-[#ef4444]" },
  announcements: { bg: "bg-[#f59e0b]/8",  text: "text-[#f59e0b]",  dot: "bg-[#f59e0b]" },
};

const CATEGORY_DEFAULT = { bg: "bg-surface-tertiary/60", text: "text-text-secondary", dot: "bg-text-tertiary" };

// ── Component ───────────────────────────────────────────────────

type StatusBadgeProps =
  | { kind: "status"; value: StatusValue; label?: string; className?: string }
  | { kind: "priority"; value: PriorityValue; label?: string; className?: string }
  | { kind: "category"; value: CategoryValue; label: string; className?: string };

export function StatusBadge(props: StatusBadgeProps) {
  const { kind, value, className } = props;

  if (kind === "status") {
    const config = STATUS_MAP[value] ?? STATUS_MAP.open;
    const Icon = config.icon;
    const displayLabel = props.label ?? config.label;
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-2 py-[3px] text-[11px] font-medium leading-none",
          config.bg, config.text,
          className
        )}
      >
        <Icon className={cn("size-3 shrink-0", config.dot)} />
        {displayLabel}
      </span>
    );
  }

  if (kind === "priority") {
    const config = PRIORITY_MAP[value] ?? PRIORITY_MAP.normal;
    const Icon = config.icon;
    const displayLabel = props.label ?? config.label;
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-2 py-[3px] text-[11px] font-medium leading-none",
          config.bg, config.text,
          className
        )}
      >
        <Icon className={cn("size-3 shrink-0", config.dot)} />
        {displayLabel}
      </span>
    );
  }

  // category
  const colors = CATEGORY_COLORS[value] ?? CATEGORY_DEFAULT;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-[3px] text-[11px] font-medium leading-none",
        colors.bg, colors.text,
        className
      )}
    >
      <span className={cn("size-1.5 rounded-full shrink-0", colors.dot)} />
      {props.label}
    </span>
  );
}
