"use client";

import { useParams } from "next/navigation";
import { NotesTab } from "@/components/projects/tabs/notes-tab";

export default function ProjectNotesPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  return <NotesTab projectId={projectId} />;
}
