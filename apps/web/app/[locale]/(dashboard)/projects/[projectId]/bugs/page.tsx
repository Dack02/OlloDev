"use client";

import { useParams } from "next/navigation";
import { BugsTab } from "@/components/projects/tabs/bugs-tab";

export default function ProjectBugsPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  return <BugsTab projectId={projectId} />;
}
