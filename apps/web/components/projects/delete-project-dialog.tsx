"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
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

interface DeleteProjectDialogProps {
  project: Project;
  trigger: React.ReactElement;
  redirectToProjects?: boolean;
}

export function DeleteProjectDialog({
  project,
  trigger,
  redirectToProjects = false,
}: DeleteProjectDialogProps) {
  const router = useRouter();
  const locale = useLocale();
  const { removeProject } = useProjectStore();
  const { org, accessToken } = useAuth();
  const orgId = org?.id;
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!orgId || !accessToken) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/projects/${project.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!res.ok) {
        const body = await res.text();
        console.error("[DeleteProjectDialog] delete failed", { status: res.status, body });
        throw new Error("Failed to delete project");
      }

      removeProject(project.id);
      notify.success("Project deleted", `"${project.name}" has been removed.`);
      setOpen(false);

      if (redirectToProjects) {
        router.push(`/${locale}/projects`);
        router.refresh();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
      notify.error("Failed to delete project", msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete project</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm text-text-secondary">
          <p>
            Delete <span className="font-medium text-text-primary">{project.name}</span>?
          </p>
          <p>
            This removes the project and its related records. Use this to clean up the extra test projects.
          </p>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <DialogFooter className="-mx-0 -mb-0 mt-1 border-t-0 bg-transparent p-0">
          <DialogClose render={<Button type="button" variant="outline" disabled={submitting} />}>
            Cancel
          </DialogClose>
          <Button variant="destructive" disabled={submitting} onClick={handleDelete}>
            {submitting ? "Deleting..." : "Delete project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
