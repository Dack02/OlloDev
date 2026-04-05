"use client";

import { useParams } from "next/navigation";
import { DevTab } from "@/components/projects/tabs/dev-tab";

export default function ProjectDevPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  return <DevTab projectId={projectId} />;
}
