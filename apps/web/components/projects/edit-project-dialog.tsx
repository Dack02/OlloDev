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
import { useProjectStore, type Project } from "@/stores/project-store";
import { useAuth } from "@/lib/auth-context";
import { notify } from "@/lib/notify";
import {
  ProjectFormFields,
  projectToFormValues,
  toProjectPayload,
  type ProjectFormValues,
} from "@/components/projects/project-form-fields";

interface EditProjectDialogProps {
  project: Project;
  trigger: React.ReactElement;
}

export function EditProjectDialog({ project, trigger }: EditProjectDialogProps) {
  const { updateProject } = useProjectStore();
  const { org, accessToken } = useAuth();
  const orgId = org?.id;
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<ProjectFormValues>(() => projectToFormValues(project));

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setValues(projectToFormValues(project));
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.name.trim() || !orgId || !accessToken) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/projects/${project.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(toProjectPayload(values)),
        }
      );

      if (!res.ok) {
        const body = await res.text();
        console.error("[EditProjectDialog] update failed", { status: res.status, body });
        throw new Error("Failed to update project");
      }

      const json = await res.json();
      updateProject(project.id, json.data);
      notify.success("Project updated", `"${values.name}" has been updated.`);
      setOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
      notify.error("Failed to update project", msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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
              {submitting ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
