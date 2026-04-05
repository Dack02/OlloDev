"use client";

import { useState } from "react";
import {
  useProjectStore,
  type TimeEntry,
} from "@/stores/project-store";
import { DetailPanel } from "@/components/layout/detail-panel";
import { FilterBar } from "@/components/ui/filter-bar";
import { useAuth } from "@/lib/auth-context";
import { useOrgMembers } from "@/hooks/use-org-members";
import { cn } from "@/lib/utils";
import { notify } from "@/lib/notify";
import { ManualTimeEntryDialog } from "@/components/projects/manual-time-entry-dialog";
import {
  ClockIcon,
  PlayIcon,
  SquareIcon,
  UserIcon,
  CalendarIcon,
  TrashIcon,
  TimerIcon,
  PencilIcon,
} from "lucide-react";

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function formatElapsed(startedAt: string): string {
  const start = new Date(startedAt).getTime();
  const now = Date.now();
  const seconds = Math.max(0, Math.round((now - start) / 1000));
  return formatDuration(seconds);
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2.5">
      <span className="text-[12px] text-text-tertiary">{label}</span>
      <div className="text-right">{children}</div>
    </div>
  );
}

interface TimeTabProps {
  projectId: string;
}

export function TimeTab({ projectId }: TimeTabProps) {
  const {
    timeEntries,
    tasks,
    runningTimer,
    setRunningTimer,
    addTimeEntry,
    updateTimeEntry,
    removeTimeEntry,
    setTimeEntries,
    detailPanelOpen,
    setDetailPanelOpen,
  } = useProjectStore();
  const { org, accessToken, user } = useAuth();
  const orgId = org?.id;
  const members = useOrgMembers();
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [timerDescription, setTimerDescription] = useState("");
  const [starting, setStarting] = useState(false);

  const projectEntries = timeEntries.filter((e) => e.project_id === projectId);
  const isTimerRunningOnThisProject = runningTimer?.project_id === projectId;

  const filterTabs = [
    { value: "all", label: "All", count: projectEntries.length },
    {
      value: "timer",
      label: "Timer",
      count: projectEntries.filter((e) => !e.is_manual).length,
    },
    {
      value: "manual",
      label: "Manual",
      count: projectEntries.filter((e) => e.is_manual).length,
    },
  ];

  const filtered =
    statusFilter === "all"
      ? projectEntries
      : statusFilter === "timer"
      ? projectEntries.filter((e) => !e.is_manual)
      : projectEntries.filter((e) => e.is_manual);

  // Group entries by day
  const grouped = filtered.reduce<Record<string, TimeEntry[]>>((acc, entry) => {
    const day = new Date(entry.started_at).toLocaleDateString("en", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    if (!acc[day]) acc[day] = [];
    acc[day].push(entry);
    return acc;
  }, {});

  const totalSeconds = projectEntries.reduce((sum, e) => sum + (e.duration_seconds ?? 0), 0);

  const handleStartTimer = async () => {
    if (!orgId || !accessToken) return;
    setStarting(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/projects/${projectId}/time-entries/start`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            description: timerDescription || null,
          }),
        }
      );
      if (!res.ok) throw new Error("Failed to start timer");
      const json = await res.json();
      setRunningTimer(json.data);
      if (json.stopped) {
        updateTimeEntry(json.stopped.id, json.stopped);
      }
      setTimerDescription("");
      notify.success("Timer started", "Tracking time on this project.");
    } catch (e) {
      notify.error("Failed to start timer", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setStarting(false);
    }
  };

  const handleStopTimer = async () => {
    if (!orgId || !accessToken || !runningTimer) return;
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
      // Add/update in the time entries list
      const existing = timeEntries.find((e) => e.id === json.data.id);
      if (existing) {
        updateTimeEntry(json.data.id, json.data);
      } else {
        addTimeEntry(json.data);
      }
      setRunningTimer(null);
      notify.success("Timer stopped", `Logged ${formatDuration(json.data.duration_seconds)}.`);
    } catch (e) {
      notify.error("Failed to stop timer", e instanceof Error ? e.message : "Unknown error");
    }
  };

  const handleDelete = async (entryId: string) => {
    if (orgId && accessToken) {
      try {
        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/projects/${projectId}/time-entries/${entryId}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
      } catch (error) {
        notify.error("Delete failed", "Could not delete time entry");
      }
    }
    removeTimeEntry(entryId);
    setDetailPanelOpen(false);
    setActiveEntryId(null);
  };

  const activeEntry = timeEntries.find((e) => e.id === activeEntryId);

  return (
    <div className="flex h-full overflow-hidden">
      {/* List */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Timer control bar */}
        <div className="px-4 py-3 border-b border-border-subtle bg-surface-secondary/30">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={timerDescription}
              onChange={(e) => setTimerDescription(e.target.value)}
              placeholder="What are you working on?"
              className="flex-1 h-8 rounded-lg border border-border-subtle bg-surface-primary px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
              disabled={isTimerRunningOnThisProject}
            />
            {isTimerRunningOnThisProject ? (
              <button
                onClick={handleStopTimer}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-error text-white text-[12px] font-medium hover:bg-error/90 transition-colors"
              >
                <SquareIcon className="size-3" />
                Stop · {formatElapsed(runningTimer!.started_at)}
              </button>
            ) : (
              <button
                onClick={handleStartTimer}
                disabled={starting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-success text-white text-[12px] font-medium hover:bg-success/90 transition-colors disabled:opacity-50"
              >
                <PlayIcon className="size-3" />
                {starting ? "Starting..." : "Start timer"}
              </button>
            )}
          </div>
          {/* Summary */}
          <div className="flex items-center gap-4 mt-2 text-[11px] text-text-tertiary">
            <span className="flex items-center gap-1">
              <ClockIcon className="size-3" />
              Total: {formatDuration(totalSeconds)}
            </span>
            <span>{projectEntries.length} entries</span>
            {runningTimer && !isTimerRunningOnThisProject && runningTimer.projects && (
              <span className="text-warning">
                Timer running on {runningTimer.projects.name}
              </span>
            )}
          </div>
        </div>

        <FilterBar>
          <FilterBar.Tabs
            items={filterTabs}
            value={statusFilter}
            onChange={setStatusFilter}
          />
          <FilterBar.Actions>
            <ManualTimeEntryDialog projectId={projectId} />
          </FilterBar.Actions>
        </FilterBar>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="size-10 rounded-xl bg-surface-secondary flex items-center justify-center mb-3">
                <ClockIcon className="size-4 text-text-tertiary" />
              </div>
              <p className="text-[13px] text-text-tertiary">No time entries yet</p>
              <p className="text-[11px] text-text-tertiary mt-1">
                Start a timer or log time manually
              </p>
            </div>
          ) : (
            Object.entries(grouped).map(([day, entries]) => {
              const dayTotal = entries.reduce((sum, e) => sum + (e.duration_seconds ?? 0), 0);
              return (
                <div key={day}>
                  <div className="flex items-center justify-between px-4 py-2 bg-surface-secondary/40">
                    <span className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">
                      {day}
                    </span>
                    <span className="text-[11px] font-medium text-text-secondary">
                      {formatDuration(dayTotal)}
                    </span>
                  </div>
                  {entries.map((entry) => {
                    const isActive = activeEntryId === entry.id;
                    const isRunning = !entry.ended_at;
                    const member = members.get(entry.user_id);
                    const memberName = member?.display_name ?? "Unknown";
                    const task = entry.task_id
                      ? tasks.find((t) => t.id === entry.task_id)
                      : null;

                    return (
                      <button
                        key={entry.id}
                        onClick={() => {
                          setActiveEntryId(entry.id);
                          setDetailPanelOpen(true);
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-border-subtle",
                          isActive
                            ? "bg-accent-muted"
                            : "hover:bg-surface-secondary/60"
                        )}
                      >
                        <div
                          className={cn(
                            "size-8 rounded-lg flex items-center justify-center shrink-0",
                            isRunning ? "bg-success-muted" : entry.is_manual ? "bg-surface-tertiary" : "bg-accent-muted"
                          )}
                        >
                          {isRunning ? (
                            <TimerIcon className="size-3.5 text-success" />
                          ) : entry.is_manual ? (
                            <PencilIcon className="size-3.5 text-text-tertiary" />
                          ) : (
                            <ClockIcon className="size-3.5 text-accent" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] text-text-primary truncate">
                            {entry.description || (task ? task.title : "No description")}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-text-tertiary">
                              {memberName}
                            </span>
                            {task && (
                              <span className="text-[11px] text-accent truncate">
                                {task.title}
                              </span>
                            )}
                            {entry.is_manual && (
                              <span className="text-[10px] px-1 py-px rounded bg-surface-tertiary text-text-tertiary">
                                manual
                              </span>
                            )}
                          </div>
                        </div>
                        <span
                          className={cn(
                            "text-[13px] font-medium tabular-nums shrink-0",
                            isRunning ? "text-success" : "text-text-secondary"
                          )}
                        >
                          {isRunning
                            ? formatElapsed(entry.started_at)
                            : formatDuration(entry.duration_seconds)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Detail panel */}
      {activeEntry && (
        <DetailPanel
          open={detailPanelOpen}
          onClose={() => {
            setDetailPanelOpen(false);
            setActiveEntryId(null);
          }}
          title={activeEntry.description || "Time entry"}
          width="w-[360px]"
        >
          <div className="px-5 py-3">
            {activeEntry.description && (
              <p className="text-[13px] text-text-secondary leading-relaxed mb-4">
                {activeEntry.description}
              </p>
            )}

            <div className="divide-y divide-border-subtle">
              <DetailRow label="Duration">
                <span className="text-[12px] font-medium text-text-primary">
                  {activeEntry.ended_at
                    ? formatDuration(activeEntry.duration_seconds)
                    : formatElapsed(activeEntry.started_at)}
                </span>
              </DetailRow>

              <DetailRow label="Type">
                <span className={cn("text-[12px] font-medium", activeEntry.is_manual ? "text-text-tertiary" : "text-accent")}>
                  {activeEntry.is_manual ? "Manual" : activeEntry.ended_at ? "Timer" : "Running"}
                </span>
              </DetailRow>

              <DetailRow label="Started">
                <span className="text-[12px] text-text-secondary">
                  {new Date(activeEntry.started_at).toLocaleString("en", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </DetailRow>

              {activeEntry.ended_at && (
                <DetailRow label="Ended">
                  <span className="text-[12px] text-text-secondary">
                    {new Date(activeEntry.ended_at).toLocaleString("en", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </DetailRow>
              )}

              <DetailRow label="User">
                {(() => {
                  const member = members.get(activeEntry.user_id);
                  const name = member?.display_name ?? "Unknown";
                  return (
                    <span className="inline-flex items-center gap-1.5 text-[12px] text-text-primary">
                      <span className="size-5 rounded-full bg-accent-muted flex items-center justify-center text-[9px] font-semibold text-accent">
                        {name.charAt(0).toUpperCase()}
                      </span>
                      {name}
                    </span>
                  );
                })()}
              </DetailRow>

              {activeEntry.task_id && (() => {
                const task = tasks.find((t) => t.id === activeEntry.task_id);
                return task ? (
                  <DetailRow label="Task">
                    <span className="text-[12px] text-accent">{task.title}</span>
                  </DetailRow>
                ) : null;
              })()}

              <DetailRow label="Created">
                <span className="text-[12px] text-text-secondary">
                  {new Date(activeEntry.created_at).toLocaleDateString("en", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </DetailRow>
            </div>

            {/* Delete button */}
            <div className="mt-5 pt-4 border-t border-border-subtle">
              <button
                onClick={() => handleDelete(activeEntry.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium text-error hover:bg-error-muted transition-colors"
              >
                <TrashIcon className="size-3.5" />
                Delete entry
              </button>
            </div>
          </div>
        </DetailPanel>
      )}
    </div>
  );
}
