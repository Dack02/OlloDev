"use client";

import { useParams } from "next/navigation";
import { TimeTab } from "@/components/projects/tabs/time-tab";

export default function ProjectTimePage() {
  const params = useParams();
  const projectId = params.projectId as string;

  return <TimeTab projectId={projectId} />;
}
