"use client";

import { useParams } from "next/navigation";
import { GitTab } from "@/components/projects/tabs/git-tab";

export default function ProjectGitPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  return <GitTab projectId={projectId} />;
}
