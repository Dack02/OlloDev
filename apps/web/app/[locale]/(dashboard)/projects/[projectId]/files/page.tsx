"use client";

import { useParams } from "next/navigation";
import { FilesTab } from "@/components/projects/tabs/files-tab";

export default function ProjectFilesPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  return <FilesTab projectId={projectId} />;
}
