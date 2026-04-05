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
import { useDiscussionsStore } from "@/stores/discussions-store";
import { useAuth } from "@/lib/auth-context";
import { notify } from "@/lib/notify";
import { PlusIcon } from "lucide-react";

interface CreateTicketDialogProps {
  projectId: string;
  trigger?: React.ReactElement;
}

export function CreateTicketDialog({ projectId, trigger }: CreateTicketDialogProps) {
  const { addDiscussion } = useDiscussionsStore();
  const { org, accessToken } = useAuth();
  const orgId = org?.id;
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("question");
  const [priority, setPriority] = useState("medium");
  const [requesterName, setRequesterName] = useState("");
  const [requesterEmail, setRequesterEmail] = useState("");

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setType("question");
    setPriority("medium");
    setRequesterName("");
    setRequesterEmail("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      if (orgId && accessToken) {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/discussions`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              title,
              body: description || `Ticket: ${title}`,
              category: "tickets",
              tags: [type],
              project_id: projectId,
              priority,
              requester_name: requesterName || undefined,
              requester_email: requesterEmail || undefined,
            }),
          }
        );
        if (!res.ok) throw new Error("Failed to create ticket");
        const json = await res.json();
        addDiscussion(json.data);
      } else {
        // Fallback: add to local store (dev mode)
        addDiscussion({
          id: `tk_${Date.now()}`,
          org_id: "",
          project_id: projectId,
          title,
          body: description || `Ticket: ${title}`,
          body_html: null,
          author_id: "user_1",
          category: "tickets",
          is_pinned: false,
          is_locked: false,
          tags: [type],
          upvotes: 0,
          reply_count: 0,
          status: "open",
          source_type: null,
          source_id: null,
          closed_at: null,
          closed_by: null,
          close_reason: null,
          assignee_id: null,
          priority,
          requester_name: requesterName || null,
          requester_email: requesterEmail || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
      notify.success("Ticket created", `"${title}" has been filed.`);
      resetForm();
      setOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
      notify.error("Failed to create ticket", msg);
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
              New ticket
            </button>
          )
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a ticket</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-1">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text-primary">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ticket title"
              required
              disabled={submitting}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text-primary">Description</label>
            <textarea
              className="min-h-[100px] w-full rounded-lg border border-border-subtle bg-surface-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description and context..."
              disabled={submitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text-primary">Type</label>
              <select
                className="h-8 rounded-lg border border-border-subtle bg-surface-primary px-2.5 text-sm text-text-primary focus:outline-none"
                value={type}
                onChange={(e) => setType(e.target.value)}
                disabled={submitting}
              >
                <option value="question">Question</option>
                <option value="bug">Bug</option>
                <option value="feature">Feature</option>
                <option value="task">Task</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text-primary">Priority</label>
              <select
                className="h-8 rounded-lg border border-border-subtle bg-surface-primary px-2.5 text-sm text-text-primary focus:outline-none"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                disabled={submitting}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text-primary">Requester Name</label>
            <Input
              value={requesterName}
              onChange={(e) => setRequesterName(e.target.value)}
              placeholder="Full name of the requester"
              disabled={submitting}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text-primary">Requester Email</label>
            <Input
              type="email"
              value={requesterEmail}
              onChange={(e) => setRequesterEmail(e.target.value)}
              placeholder="requester@example.com"
              disabled={submitting}
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <DialogFooter className="-mx-0 -mb-0 mt-1 border-t-0 bg-transparent p-0">
            <DialogClose render={<Button type="button" variant="outline" disabled={submitting} />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={submitting || !title.trim()}>
              {submitting ? "Creating..." : "Create ticket"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
