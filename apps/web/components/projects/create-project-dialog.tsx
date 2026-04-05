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
import { useProjectStore } from "@/stores/project-store";
import { useAuth } from "@/lib/auth-context";
import { notify } from "@/lib/notify";
import {
  ProjectFormFields,
  emptyProjectFormValues,
  toProjectPayload,
  type ProjectFormValues,
} from "@/components/projects/project-form-fields";

interface CreateProjectDialogProps {
  trigger?: React.ReactElement;
}

export function CreateProjectDialog({ trigger }: CreateProjectDialogProps) {
  const { addProject } = useProjectStore();
  const { org, accessToken } = useAuth();
  const orgId = org?.id;
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<ProjectFormValues>(emptyProjectFormValues);

  const resetForm = () => {
    setValues(emptyProjectFormValues);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.name.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      if (orgId && accessToken) {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/projects`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(toProjectPayload(values)),
          }
        );
        if (!res.ok) {
          const body = await res.text();
          console.error("[CreateProjectDialog] create failed", { status: res.status, body });
          throw new Error("Failed to create project");
        }
        const json = await res.json();
        addProject({
          ...json.data,
          channel_ids: [],
          wiki_space_ids: [],
          ticket_queue_ids: [],
          discussion_ids: [],
          task_count: 0,
          completed_task_count: 0,
        });
      } else {
        throw new Error(
          "Not connected — sign in and make sure the API is running to save projects."
        );
      }
      resetForm();
      setOpen(false);
      notify.success("Project created", `"${values.name}" is ready to go.`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      console.error("[CreateProjectDialog] submit error", { message: msg, orgId });
      setError(msg);
      notify.error("Failed to create project", msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => setOpen(v)}>
      <DialogTrigger render={trigger ?? <Button size="sm">New project</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-1">
          <ProjectFormFields
            values={values}
            onChange={(key, value) => setValues((prev) => ({ ...prev, [key]: value }))}
            disabled={submitting}
          />

          {error && <p className="text-xs text-red-600">{error}</p>}

          <DialogFooter className="-mx-0 -mb-0 mt-1 border-t-0 bg-transparent p-0">
            <DialogClose render={<Button type="button" variant="outline" disabled={submitting} />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={submitting || !values.name.trim()}>
              {submitting ? "Creating..." : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
