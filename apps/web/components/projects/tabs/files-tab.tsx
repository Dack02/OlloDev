"use client";

import { useProjectStore, type ProjectFile } from "@/stores/project-store";
import { useAuth } from "@/lib/auth-context";
import {
  FileIcon,
  ImageIcon,
  FileTextIcon,
  FileCodeIcon,
  UploadCloudIcon,
  DownloadIcon,
  TrashIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return ImageIcon;
  if (type === "application/pdf") return FileTextIcon;
  if (
    type === "application/json" ||
    type.includes("javascript") ||
    type.includes("typescript")
  )
    return FileCodeIcon;
  return FileIcon;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface FilesTabProps {
  projectId: string;
}

export function FilesTab({ projectId }: FilesTabProps) {
  const { files, removeFile } = useProjectStore();
  const { org, accessToken } = useAuth();
  const orgId = org?.id;
  const projectFiles = files.filter((f) => f.project_id === projectId);

  async function handleDelete(fileId: string) {
    try {
      if (orgId && accessToken) {
        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/projects/${projectId}/files/${fileId}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
      }
    } catch {
      // Continue with local removal
    }
    removeFile(fileId);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Upload area */}
      <div className="px-6 pt-5 pb-4 shrink-0">
        <div className="border-2 border-dashed border-border-default rounded-radius-md p-6 text-center hover:border-accent/40 hover:bg-accent-muted/30 transition-colors cursor-pointer">
          <UploadCloudIcon className="size-8 text-text-tertiary mx-auto mb-2" />
          <p className="text-[13px] font-medium text-text-secondary">
            Drop files here or click to upload
          </p>
          <p className="text-[11px] text-text-tertiary mt-1">
            Any file type up to 25 MB
          </p>
        </div>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {projectFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="size-10 rounded-xl bg-surface-secondary flex items-center justify-center mb-3">
              <FileIcon className="size-4 text-text-tertiary" />
            </div>
            <p className="text-[13px] text-text-tertiary">No files uploaded yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {projectFiles.map((file) => {
              const Icon = getFileIcon(file.type);

              return (
                <div
                  key={file.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-radius-sm hover:bg-surface-secondary/60 transition-colors group"
                >
                  <div className="size-9 rounded-radius-sm bg-surface-tertiary flex items-center justify-center shrink-0">
                    <Icon className="size-4 text-text-secondary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-text-primary truncate">
                      {file.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-text-tertiary">
                        {formatFileSize(file.size)}
                      </span>
                      <span className="text-[11px] text-text-tertiary">
                        {new Date(file.created_at).toLocaleDateString("en", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-tertiary transition-colors"
                      aria-label="Download"
                    >
                      <DownloadIcon className="size-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(file.id)}
                      className="p-1.5 rounded-md text-text-tertiary hover:text-error hover:bg-error-muted transition-colors"
                      aria-label="Delete"
                    >
                      <TrashIcon className="size-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
