"use client";

import { useParams } from "next/navigation";
import { useProjectStore } from "@/stores/project-store";
import { ProjectOverviewTab } from "@/components/projects/tabs/overview-tab";

export default function ProjectOverviewPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { projects } = useProjectStore();
  const project = projects.find((p) => p.id === projectId);

  if (!project) return null;

  return <ProjectOverviewTab project={project} />;
}
