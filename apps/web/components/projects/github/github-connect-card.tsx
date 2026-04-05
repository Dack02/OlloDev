"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FolderGit2Icon, LinkIcon } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { RepoPicker } from "./repo-picker";

interface GitHubConnectCardProps {
  projectId: string;
  hasInstallation: boolean;
  onConnected?: () => void;
}

export function GitHubConnectCard({
  projectId,
  hasInstallation,
  onConnected,
}: GitHubConnectCardProps) {
  const { org, accessToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleInstall = async () => {
    if (!org?.id || !accessToken) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${org.id}/github/install`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const json = await res.json();
      if (json.data?.url) {
        window.location.href = json.data.url;
      }
    } catch (e) {
      console.error("[GitHubConnect] install error", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="size-14 rounded-2xl bg-surface-tertiary flex items-center justify-center mb-4">
          <FolderGit2Icon className="size-7 text-text-secondary" />
        </div>
        <h3 className="text-[15px] font-semibold text-text-primary mb-1">
          Connect a GitHub Repository
        </h3>
        <p className="text-[13px] text-text-secondary max-w-sm mb-6">
          {hasInstallation
            ? "Select a repository to see commits, pull requests, branches, and CI status right inside your project."
            : "Install the OlloDev GitHub App on your organization to get started with Git integration."}
        </p>
        {hasInstallation ? (
          <Button onClick={() => setPickerOpen(true)} size="sm">
            <LinkIcon className="size-3.5 mr-1.5" />
            Connect repository
          </Button>
        ) : (
          <Button onClick={handleInstall} disabled={loading} size="sm">
            <FolderGit2Icon className="size-3.5 mr-1.5" />
            {loading ? "Redirecting..." : "Install GitHub App"}
          </Button>
        )}
      </div>

      {hasInstallation && (
        <RepoPicker
          projectId={projectId}
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          onConnected={onConnected}
        />
      )}
    </>
  );
}
