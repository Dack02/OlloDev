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
import { useProjectStore } from "@/stores/project-store";
import { useAuth } from "@/lib/auth-context";
import { notify } from "@/lib/notify";
import { PlusIcon } from "lucide-react";

interface CreateNoteDialogProps {
  projectId: string;
  trigger?: React.ReactElement;
}

export function CreateNoteDialog({ projectId, trigger }: CreateNoteDialogProps) {
  const { addNote } = useProjectStore();
  const { org, accessToken, user } = useAuth();
  const orgId = org?.id;
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const resetForm = () => {
    setTitle("");
    setContent("");
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
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/projects/${projectId}/notes`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ title, content }),
          }
        );
        if (!res.ok) throw new Error("Failed to create note");
        const json = await res.json();
        addNote(json.data);
      } else {
        addNote({
          id: `n_${Date.now()}`,
          project_id: projectId,
          title,
          content,
          author_id: user?.id ?? null,
          is_pinned: false,
          color: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
      notify.success("Note created", `"${title}" saved.`);
      resetForm();
      setOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
      notify.error("Failed to create note", msg);
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
              New note
            </button>
          )
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a note</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-1">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text-primary">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title"
              required
              disabled={submitting}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text-primary">Content</label>
            <textarea
              className="min-h-[140px] w-full rounded-lg border border-border-subtle bg-surface-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent resize-none"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your note..."
              disabled={submitting}
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <DialogFooter className="-mx-0 -mb-0 mt-1 border-t-0 bg-transparent p-0">
            <DialogClose render={<Button type="button" variant="outline" disabled={submitting} />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={submitting || !title.trim()}>
              {submitting ? "Creating..." : "Create note"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
