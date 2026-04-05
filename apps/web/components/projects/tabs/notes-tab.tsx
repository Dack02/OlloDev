"use client";

import { useState } from "react";
import {
  useProjectStore,
  type ProjectNote,
} from "@/stores/project-store";
import { DetailPanel } from "@/components/layout/detail-panel";
import { FilterBar } from "@/components/ui/filter-bar";
import { CreateNoteDialog } from "@/components/projects/create-note-dialog";
import { useAuth } from "@/lib/auth-context";
import { useOrgMembers } from "@/hooks/use-org-members";
import { cn } from "@/lib/utils";
import { notify } from "@/lib/notify";
import {
  StickyNoteIcon,
  PinIcon,
  Trash2Icon,
  CalendarIcon,
} from "lucide-react";

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2.5">
      <span className="text-[12px] text-text-tertiary">{label}</span>
      <div className="text-right">{children}</div>
    </div>
  );
}

interface NotesTabProps {
  projectId: string;
}

export function NotesTab({ projectId }: NotesTabProps) {
  const {
    notes,
    activeNoteId,
    setActiveNote,
    detailPanelOpen,
    setDetailPanelOpen,
    updateNote,
    setNotes,
  } = useProjectStore();
  const { org, accessToken } = useAuth();
  const orgId = org?.id;
  const members = useOrgMembers();
  const [filter, setFilter] = useState("all");

  const projectNotes = notes.filter((n) => n.project_id === projectId);

  const filterTabs = [
    { value: "all", label: "All", count: projectNotes.length },
    { value: "pinned", label: "Pinned", count: projectNotes.filter((n) => n.is_pinned).length },
  ];

  const filtered =
    filter === "pinned"
      ? projectNotes.filter((n) => n.is_pinned)
      : projectNotes;

  // Sort: pinned first, then by updated_at desc
  const sorted = [...filtered].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  const activeNote = notes.find((n) => n.id === activeNoteId);

  const handleUpdate = async (noteId: string, updates: Partial<ProjectNote>) => {
    updateNote(noteId, updates);

    if (orgId && accessToken) {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/projects/${projectId}/notes/${noteId}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updates),
          }
        );
        if (!response.ok) {
          notify.error("Update failed", "Could not update note");
        }
      } catch (error) {
        notify.error("Update failed", "Could not reach the server");
      }
    }
  };

  const handleDelete = async (noteId: string) => {
    if (orgId && accessToken) {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/projects/${projectId}/notes/${noteId}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        if (!response.ok) {
          notify.error("Delete failed", "Could not delete note");
        }
      } catch (error) {
        notify.error("Delete failed", "Could not reach the server");
      }
    }

    setNotes(notes.filter((n) => n.id !== noteId));
    setDetailPanelOpen(false);
    setActiveNote(null);
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* List */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <FilterBar>
          <FilterBar.Tabs
            items={filterTabs}
            value={filter}
            onChange={setFilter}
          />
          <FilterBar.Actions>
            <CreateNoteDialog projectId={projectId} />
          </FilterBar.Actions>
        </FilterBar>

        <div className="flex-1 overflow-y-auto">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="size-10 rounded-xl bg-surface-secondary flex items-center justify-center mb-3">
                <StickyNoteIcon className="size-4 text-text-tertiary" />
              </div>
              <p className="text-[13px] text-text-tertiary">No notes yet</p>
            </div>
          ) : (
            sorted.map((note) => {
              const isActive = activeNoteId === note.id;
              const preview = note.content.slice(0, 120).replace(/\n/g, " ");
              const author = note.author_id ? members.get(note.author_id) : null;

              return (
                <button
                  key={note.id}
                  onClick={() => {
                    setActiveNote(note.id);
                    setDetailPanelOpen(true);
                  }}
                  className={cn(
                    "w-full flex flex-col gap-1 px-4 py-3 text-left transition-colors border-b border-border-subtle",
                    isActive
                      ? "bg-accent-muted"
                      : "hover:bg-surface-secondary/60"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {note.is_pinned && (
                      <PinIcon className="size-3 text-accent shrink-0" />
                    )}
                    {note.color && (
                      <span
                        className="size-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: note.color }}
                      />
                    )}
                    <span className="flex-1 text-[13px] font-medium text-text-primary truncate">
                      {note.title}
                    </span>
                    <span className="text-[11px] text-text-tertiary shrink-0">
                      {new Date(note.updated_at).toLocaleDateString("en", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  {preview && (
                    <p className="text-[12px] text-text-tertiary truncate">
                      {preview}
                    </p>
                  )}
                  {author && (
                    <span className="text-[11px] text-text-tertiary">
                      {author.display_name ?? "Unknown"}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Detail panel */}
      {activeNote && (
        <DetailPanel
          open={detailPanelOpen}
          onClose={() => {
            setDetailPanelOpen(false);
            setActiveNote(null);
          }}
          title={activeNote.title}
          width="w-[420px]"
        >
          <div className="px-5 py-3 flex flex-col gap-4">
            {/* Editable title */}
            <input
              className="text-[15px] font-semibold text-text-primary bg-transparent border-none outline-none w-full"
              value={activeNote.title}
              onChange={(e) => handleUpdate(activeNote.id, { title: e.target.value })}
            />

            {/* Editable content */}
            <textarea
              className="flex-1 min-h-[200px] w-full rounded-lg border border-border-subtle bg-surface-primary px-3 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent resize-none leading-relaxed"
              value={activeNote.content}
              onChange={(e) => handleUpdate(activeNote.id, { content: e.target.value })}
              placeholder="Write your note..."
            />

            <div className="divide-y divide-border-subtle">
              <DetailRow label="Pinned">
                <button
                  onClick={() => handleUpdate(activeNote.id, { is_pinned: !activeNote.is_pinned })}
                  className={cn(
                    "text-[12px] font-medium px-2 py-0.5 rounded-md transition-colors",
                    activeNote.is_pinned
                      ? "bg-accent-muted text-accent"
                      : "bg-surface-tertiary text-text-tertiary hover:text-text-secondary"
                  )}
                >
                  {activeNote.is_pinned ? "Pinned" : "Not pinned"}
                </button>
              </DetailRow>

              <DetailRow label="Author">
                {activeNote.author_id ? (() => {
                  const member = members.get(activeNote.author_id!);
                  const name = member?.display_name ?? "Unknown";
                  return (
                    <span className="inline-flex items-center gap-1.5 text-[12px] text-text-primary">
                      <span className="size-5 rounded-full bg-accent-muted flex items-center justify-center text-[9px] font-semibold text-accent">
                        {name.charAt(0).toUpperCase()}
                      </span>
                      {name}
                    </span>
                  );
                })() : (
                  <span className="text-[12px] text-text-tertiary">Unknown</span>
                )}
              </DetailRow>

              <DetailRow label="Updated">
                <span className="inline-flex items-center gap-1 text-[12px] text-text-secondary">
                  <CalendarIcon className="size-3 text-text-tertiary" />
                  {new Date(activeNote.updated_at).toLocaleDateString("en", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </DetailRow>

              <DetailRow label="Created">
                <span className="text-[12px] text-text-secondary">
                  {new Date(activeNote.created_at).toLocaleDateString("en", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </DetailRow>
            </div>

            <div className="pt-4 border-t border-border-subtle">
              <button
                onClick={() => handleDelete(activeNote.id)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-error-muted text-error hover:bg-error-muted/80 transition-colors text-[12px] font-medium"
              >
                <Trash2Icon className="size-4" />
                Delete
              </button>
            </div>
          </div>
        </DetailPanel>
      )}
    </div>
  );
}
