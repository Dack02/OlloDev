"use client";

import { useParams } from "next/navigation";
import { ChatTab } from "@/components/projects/tabs/chat-tab";

export default function ProjectChatPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  return <ChatTab projectId={projectId} />;
}
