"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ChevronDownIcon, MailIcon } from "lucide-react";
import { ORG_ROLES } from "@ollo-dev/shared/constants";

// Graceful import of auth context
let useAuthHook: (() => {
  user: { id: string } | null;
  org: { id: string } | null;
  accessToken: string | null;
  loading: boolean;
}) | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  useAuthHook = require("@/lib/auth-context").useAuth;
} catch {
  useAuthHook = null;
}

function useAuthSafe() {
  if (useAuthHook) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useAuthHook();
  }
  return { user: null, org: null, accessToken: null, loading: false };
}

interface MemberWithProfile {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profiles: {
    display_name?: string;
    email?: string;
    avatar_url?: string;
  } | null;
}

interface PendingInvite {
  id: string;
  org_id: string;
  email: string;
  role: string;
  invited_by: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function MembersPage() {
  const t = useTranslations("admin");
  const { user, org, accessToken } = useAuthSafe();

  // Members state
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  // Invite dialog state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  // Remove dialog state
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removingMember, setRemovingMember] = useState<MemberWithProfile | null>(null);
  const [removing, setRemoving] = useState(false);

  // Pending invites state
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Role update state
  const [roleUpdating, setRoleUpdating] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

  const initials = (name?: string | null) =>
    name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?";

  function authHeaders(): HeadersInit {
    return accessToken
      ? { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }
      : { "Content-Type": "application/json" };
  }

  // Derive current user role from members list
  const currentUserRole = members.find((m) => m.user_id === user?.id)?.role;
  const isAdminOrOwner = currentUserRole === "owner" || currentUserRole === "admin";

  async function loadMembers() {
    if (!org?.id || !accessToken) return;
    setLoadingMembers(true);
    try {
      const res = await fetch(`${apiUrl}/api/v1/orgs/${org.id}/members`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        setMembers(json.data ?? []);
      }
    } finally {
      setLoadingMembers(false);
    }
  }

  async function loadInvites() {
    if (!org?.id || !accessToken) return;
    try {
      const res = await fetch(`${apiUrl}/api/v1/orgs/${org.id}/invites`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        setPendingInvites(json.data ?? []);
      }
    } catch {
      // non-critical
    }
  }

  async function handleResendInvite(inviteId: string) {
    if (!org?.id || !accessToken) return;
    setResendingId(inviteId);
    setActionError(null);
    try {
      const res = await fetch(
        `${apiUrl}/api/v1/orgs/${org.id}/invites/${inviteId}/resend`,
        { method: "POST", headers: authHeaders() }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        setActionError(err?.error?.message ?? t("resendError"));
        setTimeout(() => setActionError(null), 5000);
      }
    } finally {
      setResendingId(null);
    }
  }

  async function handleCancelInvite(inviteId: string) {
    if (!org?.id || !accessToken) return;
    setCancellingId(inviteId);
    setActionError(null);
    try {
      const res = await fetch(
        `${apiUrl}/api/v1/orgs/${org.id}/invites/${inviteId}`,
        { method: "DELETE", headers: authHeaders() }
      );
      if (res.ok) {
        setPendingInvites((prev) => prev.filter((inv) => inv.id !== inviteId));
      } else {
        const err = await res.json().catch(() => null);
        setActionError(err?.error?.message ?? t("cancelInviteError"));
        setTimeout(() => setActionError(null), 5000);
      }
    } finally {
      setCancellingId(null);
    }
  }

  async function handleInvite() {
    if (!org?.id || !accessToken || !inviteEmail.trim()) return;
    setInviting(true);
    setInviteError(null);
    setInviteSuccess(null);
    try {
      const res = await fetch(`${apiUrl}/api/v1/orgs/${org.id}/members/invite`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      if (res.ok) {
        setInviteSuccess(t("inviteSuccess"));
        setInviteEmail("");
        setInviteRole("member");
        await Promise.all([loadMembers(), loadInvites()]);
        setTimeout(() => setInviteSuccess(null), 3000);
      } else {
        const err = await res.json().catch(() => null);
        setInviteError(err?.error?.message ?? err?.message ?? t("inviteError"));
      }
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    if (!org?.id || !accessToken) return;
    setRoleUpdating(userId);
    setActionError(null);
    try {
      const res = await fetch(`${apiUrl}/api/v1/orgs/${org.id}/members/${userId}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setMembers((prev) =>
          prev.map((m) => (m.user_id === userId ? { ...m, role: newRole } : m))
        );
      } else {
        const err = await res.json().catch(() => null);
        setActionError(err?.error?.message ?? t("roleUpdateError"));
        setTimeout(() => setActionError(null), 5000);
      }
    } finally {
      setRoleUpdating(null);
    }
  }

  async function handleRemoveMember() {
    if (!org?.id || !accessToken || !removingMember) return;
    setRemoving(true);
    setActionError(null);
    try {
      const res = await fetch(
        `${apiUrl}/api/v1/orgs/${org.id}/members/${removingMember.user_id}`,
        { method: "DELETE", headers: authHeaders() }
      );
      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.user_id !== removingMember.user_id));
        setRemoveOpen(false);
        setRemovingMember(null);
      } else {
        const err = await res.json().catch(() => null);
        setActionError(err?.error?.message ?? t("removeError"));
        setTimeout(() => setActionError(null), 5000);
      }
    } finally {
      setRemoving(false);
    }
  }

  useEffect(() => {
    if (!org?.id || !accessToken) {
      setLoadingMembers(false);
      return;
    }
    loadMembers();
    loadInvites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org?.id, accessToken]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">{t("membersTitle")}</h1>
        <p className="mt-1 text-sm text-text-secondary">{t("membersDescription")}</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t("membersTitle")}</CardTitle>
            <CardDescription>
              {members.length > 0 && `${members.length} member${members.length !== 1 ? "s" : ""}`}
            </CardDescription>
          </div>
          {isAdminOrOwner && (
            <Dialog
              open={inviteOpen}
              onOpenChange={(v) => {
                setInviteOpen(v);
                if (!v) {
                  setInviteEmail("");
                  setInviteRole("member");
                  setInviteError(null);
                  setInviteSuccess(null);
                }
              }}
            >
              <Button size="sm" onClick={() => setInviteOpen(true)}>
                {t("inviteUser")}
              </Button>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("inviteUser")}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">
                      {t("inviteEmail")}
                    </label>
                    <Input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="user@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">
                      {t("inviteRole")}
                    </label>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="flex h-9 w-full items-center justify-between rounded-md border border-border-default bg-surface-primary px-3 py-2 text-sm text-text-primary"
                      >
                        <span className="capitalize">{t(`role_${inviteRole}`)}</span>
                        <ChevronDownIcon className="h-4 w-4 text-text-secondary" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {ORG_ROLES.map((role) => (
                          <DropdownMenuItem
                            key={role}
                            onClick={() => setInviteRole(role)}
                          >
                            <span className="capitalize">{t(`role_${role}`)}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <Button
                    onClick={handleInvite}
                    disabled={inviting || !inviteEmail.trim()}
                  >
                    {inviting ? t("sending") : t("sendInvite")}
                  </Button>
                  {inviteError && (
                    <p className="text-sm text-red-600">{inviteError}</p>
                  )}
                  {inviteSuccess && (
                    <p className="text-sm text-green-600">{inviteSuccess}</p>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {loadingMembers ? (
            <p className="text-sm text-text-secondary">{t("loadingMembers")}</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-text-secondary">{t("noMembers")}</p>
          ) : (
            <ul className="divide-y divide-border-subtle">
              {members.map((member) => (
                <li key={member.id} className="flex items-center gap-3 py-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.profiles?.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {initials(member.profiles?.display_name || member.profiles?.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {member.profiles?.display_name ?? member.profiles?.email ?? member.user_id}
                    </p>
                    {member.profiles?.email && member.profiles?.display_name && (
                      <p className="text-xs text-text-secondary truncate">
                        {member.profiles.email}
                      </p>
                    )}
                  </div>

                  {/* Role dropdown or static badge */}
                  {isAdminOrOwner && member.user_id !== user?.id ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="flex items-center gap-1 rounded-md border border-border-default px-2 py-1 text-xs capitalize text-text-primary hover:bg-surface-secondary transition-colors"
                      >
                        {roleUpdating === member.user_id ? "..." : member.role}
                        <ChevronDownIcon className="h-3 w-3 text-text-secondary" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {ORG_ROLES.map((role) => (
                          <DropdownMenuItem
                            key={role}
                            onClick={() => handleRoleChange(member.user_id, role)}
                          >
                            <span className="capitalize">
                              {t(`role_${role}`)}
                              {role === member.role ? " (current)" : ""}
                            </span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <Badge variant="outline" className="text-xs capitalize shrink-0">
                      {member.role}
                    </Badge>
                  )}

                  {/* Remove button */}
                  {isAdminOrOwner && member.user_id !== user?.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
                      onClick={() => {
                        setRemovingMember(member);
                        setRemoveOpen(true);
                      }}
                    >
                      {t("remove")}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {actionError && (
            <div className="mt-3 rounded-md bg-red-50 border border-red-200 px-3 py-2">
              <p className="text-sm text-red-700">{actionError}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {isAdminOrOwner && pendingInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("pendingInvites")}</CardTitle>
            <CardDescription>
              {pendingInvites.length} pending
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border-subtle">
              {pendingInvites.map((invite) => (
                <li key={invite.id} className="flex items-center gap-3 py-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      <MailIcon className="h-4 w-4 text-text-secondary" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {invite.email}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {t("invitedAs", { role: invite.role })}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs capitalize shrink-0">
                    {invite.role}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    disabled={resendingId === invite.id}
                    onClick={() => handleResendInvite(invite.id)}
                  >
                    {resendingId === invite.id ? t("resending") : t("resendInvite")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
                    disabled={cancellingId === invite.id}
                    onClick={() => handleCancelInvite(invite.id)}
                  >
                    {t("cancelInvite")}
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Remove Confirmation Dialog */}
      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("removeMember")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-secondary">
            {t("removeConfirm", {
              name:
                removingMember?.profiles?.display_name ??
                removingMember?.profiles?.email ??
                "",
            })}
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setRemoveOpen(false);
                setRemovingMember(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveMember}
              disabled={removing}
            >
              {removing ? t("removing") : t("remove")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
