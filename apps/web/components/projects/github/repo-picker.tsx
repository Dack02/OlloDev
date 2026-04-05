"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useProjectStore } from "@/stores/project-store";
import { notify } from "@/lib/notify";
import { FolderGit2Icon, SearchIcon, LockIcon, CheckIcon } from "lucide-react";

interface AvailableRepo {
  github_repo_id: number;
  full_name: string;
  name: string;
  private: boolean;
  default_branch: string;
  description: string | null;
  language: string | null;
  updated_at: string | null;
}

interface RepoPickerProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected?: () => void;
}

export function RepoPicker({
  projectId,
  open,
  onOpenChange,
  onConnected,
}: RepoPickerProps) {
  const { org, accessToken } = useAuth();
  const { setGitHubRepos } = useProjectStore();
  const [repos, setRepos] = useState<AvailableRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open || !org?.id || !accessToken) return;
    setLoading(true);
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${org.id}/github/repos/available?per_page=100`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
      .then((r) => r.json())
      .then((json) => {
        setRepos(json.data ?? []);
      })
      .catch((e) => console.error("[RepoPicker] fetch error", e))
      .finally(() => setLoading(false));
  }, [open, org?.id, accessToken]);

  const filtered = repos.filter((r) =>
    r.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const handleConnect = async (repo: AvailableRepo) => {
    if (!org?.id || !accessToken) return;
    setConnecting(repo.github_repo_id);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${org.id}/projects/${projectId}/github/repos`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            github_repo_id: repo.github_repo_id,
            full_name: repo.full_name,
            default_branch: repo.default_branch,
          }),
        }
      );
      if (!res.ok) throw new Error("Failed to connect repository");

      // Refresh connected repos
      const listRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${org.id}/projects/${projectId}/github/repos`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const listJson = await listRes.json();
      setGitHubRepos(listJson.data ?? []);

      notify.success("Repository connected", `${repo.full_name} is now linked to this project.`);
      onOpenChange(false);
      onConnected?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      notify.error("Failed to connect", msg);
    } finally {
      setConnecting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Connect a GitHub Repository</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-text-tertiary" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search repositories..."
            className="pl-9"
          />
        </div>
        <div className="max-h-[360px] overflow-y-auto -mx-1">
          {loading ? (
            <p className="text-[13px] text-text-tertiary text-center py-8">
              Loading repositories...
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-[13px] text-text-tertiary text-center py-8">
              {repos.length === 0 ? "No repositories available" : "No matching repositories"}
            </p>
          ) : (
            <div className="divide-y divide-border-subtle">
              {filtered.map((repo) => (
                <button
                  key={repo.github_repo_id}
                  onClick={() => handleConnect(repo)}
                  disabled={connecting !== null}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-surface-tertiary/40 transition-colors text-left disabled:opacity-50"
                >
                  <FolderGit2Icon className="size-4 mt-0.5 text-text-secondary shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-medium text-text-primary truncate">
                        {repo.full_name}
                      </span>
                      {repo.private && <LockIcon className="size-3 text-text-tertiary shrink-0" />}
                    </div>
                    {repo.description && (
                      <p className="text-[11px] text-text-tertiary mt-0.5 line-clamp-1">
                        {repo.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-0.5">
                      {repo.language && (
                        <span className="text-[11px] text-text-tertiary">{repo.language}</span>
                      )}
                      <span className="text-[11px] text-text-tertiary">{repo.default_branch}</span>
                    </div>
                  </div>
                  {connecting === repo.github_repo_id && (
                    <span className="text-[11px] text-accent shrink-0 mt-0.5">Connecting...</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
