"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useProjectStore } from "@/stores/project-store";
import { useAuth } from "@/lib/auth-context";
import { notify } from "@/lib/notify";
import { SquareIcon, ClockIcon } from "lucide-react";

function formatElapsed(startedAt: string): string {
  const start = new Date(startedAt).getTime();
  const now = Date.now();
  const totalSeconds = Math.max(0, Math.round((now - start) / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

export function TimerWidget() {
  const { runningTimer, setRunningTimer, addTimeEntry, updateTimeEntry, timeEntries } =
    useProjectStore();
  const { org, accessToken } = useAuth();
  const orgId = org?.id;
  const locale = useLocale();
  const router = useRouter();
  const [elapsed, setElapsed] = useState("");
  const [stopping, setStopping] = useState(false);

  // Tick the timer display every second
  useEffect(() => {
    if (!runningTimer) {
      setElapsed("");
      return;
    }
    setElapsed(formatElapsed(runningTimer.started_at));
    const interval = setInterval(() => {
      setElapsed(formatElapsed(runningTimer.started_at));
    }, 1000);
    return () => clearInterval(interval);
  }, [runningTimer]);

  // Poll for running timer on mount (catches timers started in other tabs)
  useEffect(() => {
    if (!orgId || !accessToken) return;
    // We need any project ID to hit the running endpoint; use a dummy approach
    // by fetching from a known project. But the running endpoint is project-scoped
    // in the route, so we fetch all projects and use the first one.
    // Alternative: the layout already fetches this. This is a fallback poll.
    const interval = setInterval(async () => {
      try {
        const projects = useProjectStore.getState().projects;
        if (projects.length === 0) return;
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/projects/${projects[0].id}/time-entries/running`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (res.ok) {
          const json = await res.json();
          setRunningTimer(json.data ?? null);
        }
      } catch {
        // silent
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [orgId, accessToken, setRunningTimer]);

  if (!runningTimer) return null;

  const projectName = runningTimer.projects?.name ?? "Project";
  const projectColor = runningTimer.projects?.color ?? "#3b82f6";

  const handleStop = async () => {
    if (!orgId || !accessToken || stopping) return;
    setStopping(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/projects/${runningTimer.project_id}/time-entries/${runningTimer.id}/stop`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (!res.ok) throw new Error("Failed to stop timer");
      const json = await res.json();
      const existing = timeEntries.find((e) => e.id === json.data.id);
      if (existing) {
        updateTimeEntry(json.data.id, json.data);
      } else {
        addTimeEntry(json.data);
      }
      setRunningTimer(null);
      notify.success(
        "Timer stopped",
        `Logged ${formatDuration(json.data.duration_seconds)} on ${projectName}.`
      );
    } catch (e) {
      notify.error("Failed to stop timer", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setStopping(false);
    }
  };

  const handleNavigate = () => {
    router.push(`/${locale}/projects/${runningTimer.project_id}/time`);
  };

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-radius-sm bg-success-muted border border-success/20">
      <ClockIcon className="size-3.5 text-success animate-pulse" />
      <button
        onClick={handleNavigate}
        className="flex items-center gap-1.5 text-[12px] font-medium text-text-primary hover:text-accent transition-colors"
      >
        <span
          className="size-2 rounded-full shrink-0"
          style={{ backgroundColor: projectColor }}
        />
        <span className="max-w-[120px] truncate">{projectName}</span>
      </button>
      <span className="text-[12px] font-mono font-medium text-success tabular-nums">
        {elapsed}
      </span>
      <button
        onClick={handleStop}
        disabled={stopping}
        className="p-1 rounded-sm text-error hover:bg-error-muted transition-colors disabled:opacity-50"
        aria-label="Stop timer"
      >
        <SquareIcon className="size-3" />
      </button>
    </div>
  );
}
