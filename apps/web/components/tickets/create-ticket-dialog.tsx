"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
import { useTicketStore } from "@/stores/ticket-store";
import { useAuth } from "@/lib/auth-context";
import type { Ticket } from "@ollo-dev/shared/types";

interface CreateTicketDialogProps {
  trigger?: React.ReactElement;
}

export function CreateTicketDialog({ trigger }: CreateTicketDialogProps) {
  const t = useTranslations("tickets");
  const tCommon = useTranslations("common");
  const { addTicket } = useTicketStore();
  const { org, accessToken } = useAuth();
  const orgId = org?.id;
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("normal");
  const [type, setType] = useState("question");
  const [queue, setQueue] = useState("");

  const resetForm = () => {
    setSubject("");
    setDescription("");
    setPriority("normal");
    setType("question");
    setQueue("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !orgId || !accessToken) return;

    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, string> = {
        subject,
        description,
        priority,
        type,
      };
      if (queue) body.queue_id = queue;

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/tickets`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) throw new Error("Failed to create ticket");
      const json = await res.json();
      const ticket: Ticket = json.data ?? json;
      addTicket(ticket);
      resetForm();
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger ?? <Button size="sm">{t("newTicket")}</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("newTicket")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-1">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text-primary">{t("subject")}</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief description of the issue"
              required
              disabled={submitting}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text-primary">{t("description")}</label>
            <textarea
              className="min-h-[100px] w-full rounded-lg border border-border-subtle bg-surface-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide more details..."
              disabled={submitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text-primary">Priority</label>
              <select
                className="h-8 rounded-lg border border-border-subtle bg-surface-primary px-2.5 text-sm text-text-primary focus:outline-none"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                disabled={submitting}
              >
                <option value="low">{t("priority.low")}</option>
                <option value="normal">{t("priority.normal")}</option>
                <option value="high">{t("priority.high")}</option>
                <option value="urgent">{t("priority.urgent")}</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text-primary">{t("type")}</label>
              <select
                className="h-8 rounded-lg border border-border-subtle bg-surface-primary px-2.5 text-sm text-text-primary focus:outline-none"
                value={type}
                onChange={(e) => setType(e.target.value)}
                disabled={submitting}
              >
                <option value="question">{t("type_labels.question")}</option>
                <option value="bug">{t("type_labels.bug")}</option>
                <option value="feature">{t("type_labels.feature")}</option>
                <option value="task">{t("type_labels.task")}</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text-primary">{t("queue")} (optional)</label>
            <Input
              value={queue}
              onChange={(e) => setQueue(e.target.value)}
              placeholder="Queue ID"
              disabled={submitting}
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <DialogFooter className="-mx-0 -mb-0 mt-1 border-t-0 bg-transparent p-0">
            <DialogClose render={<Button type="button" variant="outline" disabled={submitting} />}>
              {tCommon("cancel")}
            </DialogClose>
            <Button type="submit" disabled={submitting || !subject.trim()}>
              {submitting ? "Creating..." : tCommon("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
