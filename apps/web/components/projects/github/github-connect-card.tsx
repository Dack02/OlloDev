"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FolderGit2Icon, LinkIcon, AlertCircleIcon, UnplugIcon } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { notify } from "@/lib/notify";
import { RepoPicker } from "./repo-picker";

interface GitHubConnectCardProps {
  projectId: string;
  hasInstallation: boolean;
  /** null = unknown, true = configured, false = not configured */
  isConfigured: boolean | null;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export function GitHubConnectCard({
  projectId,
  hasInstallation,
  isConfigured,
  onConnected,
  onDisconnected,
}: GitHubConnectCardProps) {
  const { org, accessToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
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
      if (!res.ok) {
        const msg = json.error?.message ?? "Failed to start GitHub installation";
        notify.error("GitHub setup", msg);
        return;
      }
      if (json.data?.url) {
        window.location.href = json.data.url;
      }
    } catch (e) {
      console.error("[GitHubConnect] install error", e);
      notify.error("GitHub setup", "Could not reach the API server");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!org?.id || !accessToken) return;
    setDisconnecting(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${org.id}/github/installation`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (!res.ok) {
        const json = await res.json();
        notify.error("Disconnect failed", json.error?.message ?? "Unknown error");
        return;
      }
      notify.success("GitHub disconnected", "The GitHub App has been disconnected.");
      onDisconnected?.();
    } catch (e) {
      notify.error("Disconnect failed", "Could not reach the API server");
    } finally {
      setDisconnecting(false);
    }
  };

  // GitHub App not configured on the server
  if (isConfigured === false) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="size-14 rounded-2xl bg-surface-tertiary flex items-center justify-center mb-4">
          <FolderGit2Icon className="size-7 text-text-secondary" />
        </div>
        <h3 className="text-[15px] font-semibold text-text-primary mb-1">
          GitHub Integration
        </h3>
        <p className="text-[13px] text-text-secondary max-w-sm mb-4">
          The GitHub App has not been configured on the server yet. An administrator needs to set the
          following environment variables:
        </p>
        <div className="rounded-radius-md border border-border-subtle bg-surface-elevated p-4 text-left max-w-sm w-full">
          <code className="text-[12px] text-text-secondary leading-relaxed block space-y-1">
            <span className="block">GITHUB_APP_ID</span>
            <span className="block">GITHUB_APP_PRIVATE_KEY</span>
            <span className="block">GITHUB_CLIENT_ID</span>
            <span className="block">GITHUB_CLIENT_SECRET</span>
            <span className="block">GITHUB_WEBHOOK_SECRET</span>
          </code>
        </div>
        <div className="flex items-center gap-1.5 mt-4 text-[12px] text-text-tertiary">
          <AlertCircleIcon className="size-3.5" />
          <span>See the GitHub Integration docs for setup instructions</span>
        </div>
      </div>
    );
  }

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
          <div className="flex items-center gap-2">
            <Button onClick={() => setPickerOpen(true)} size="sm">
              <LinkIcon className="size-3.5 mr-1.5" />
              Connect repository
            </Button>
            <Button
              onClick={handleDisconnect}
              disabled={disconnecting}
              size="sm"
              variant="outline"
              className="text-text-tertiary hover:text-red-600"
            >
              <UnplugIcon className="size-3.5 mr-1.5" />
              {disconnecting ? "Disconnecting..." : "Disconnect"}
            </Button>
          </div>
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
