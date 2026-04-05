"use client";

import { useParams } from "next/navigation";
import { TicketsTab } from "@/components/projects/tabs/tickets-tab";

export default function ProjectTicketsPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  return <TicketsTab projectId={projectId} />;
}
