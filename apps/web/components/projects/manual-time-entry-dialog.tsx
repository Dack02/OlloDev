"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProjectStore, type TimeEntry } from "@/stores/project-store";
import { useAuth } from "@/lib/auth-context";
import { notify } from "@/lib/notify";
import { PlusIcon } from "lucide-react";

interface ManualTimeEntryDialogProps {
  projectId: string;
  trigger?: React.ReactElement;
}

export function ManualTimeEntryDialog({ projectId, trigger }: ManualTimeEntryDialogProps) {
  const { addTimeEntry, tasks } = useProjectStore();
  const { org, accessToken } = useAuth();
  const orgId = org?.id;
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("30");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [taskId, setTaskId] = useState("");

  const projectTasks = tasks.filter((t) => t.project_id === projectId);

  const resetForm = () => {
    setHours("0");
    setMinutes("30");
    setDescription("");
    setDate(new Date().toISOString().slice(0, 10));
    setTaskId("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalSeconds = (parseInt(hours) || 0) * 3600 + (parseInt(minutes) || 0) * 60;
    if (totalSeconds <= 0) {
      setError("Duration must be greater than zero");
      return;
    }

    setSubmitting(true);
    setError(null);

    const startedAt = new Date(`${date}T09:00:00`);
    const endedAt = new Date(startedAt.getTime() + totalSeconds * 1000);

    const payload = {
      task_id: taskId || null,
      description: description || null,
      started_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      duration_seconds: totalSeconds,
      is_manual: true,
    };

    try {
      if (orgId && accessToken) {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/projects/${projectId}/time-entries`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(payload),
          }
        );
        if (!res.ok) throw new Error("Failed to create time entry");
        const json = await res.json();
        addTimeEntry(json.data);
      } else {
        addTimeEntry({
          id: `te_${Date.now()}`,
          org_id: orgId ?? "",
          project_id: projectId,
          user_id: "user_1",
          ...payload,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as TimeEntry);
      }
      notify.success("Time logged", `${hours}h ${minutes}m added.`);
      resetForm();
      setOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
      notify.error("Failed to log time", msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ?? (
            <button className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-accent text-white text-[12px] font-medium hover:bg-accent-hover transition-colors">
              <PlusIcon className="size-3" />
              Log time
            </button>
          )
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log time manually</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text-primary">Hours</label>
              <Input
                type="number"
                min="0"
                max="24"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text-primary">Minutes</label>
              <Input
                type="number"
                min="0"
                max="59"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text-primary">Date</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={submitting}
            />
          </div>

          {projectTasks.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text-primary">Task (optional)</label>
              <select
                className="h-8 rounded-lg border border-border-subtle bg-surface-primary px-2.5 text-sm text-text-primary focus:outline-none"
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                disabled={submitting}
              >
                <option value="">No task</option>
                {projectTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text-primary">Description</label>
            <textarea
              className="min-h-[80px] w-full rounded-lg border border-border-subtle bg-surface-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What did you work on?"
              disabled={submitting}
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <DialogFooter className="-mx-0 -mb-0 mt-1 border-t-0 bg-transparent p-0">
            <DialogClose render={<Button type="button" variant="outline" disabled={submitting} />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Logging..." : "Log time"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
