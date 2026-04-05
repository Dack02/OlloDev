"use client";

import { useParams } from "next/navigation";
import { DiscussionsTab } from "@/components/projects/tabs/discussions-tab";

export default function ProjectDiscussionsPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  return <DiscussionsTab projectId={projectId} />;
}
