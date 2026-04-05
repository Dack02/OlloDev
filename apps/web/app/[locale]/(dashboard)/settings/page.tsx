"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { useAuth } from "@/lib/auth-context";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
}

interface Webhook {
  id: string;
  url: string;
  events: string[];
  is_active: boolean;
  created_at: string;
}

interface OrgMember {
  id: string;
  display_name?: string;
  email?: string;
  avatar_url?: string;
  role?: string;
}

export default function SettingsPage() {
  const t = useTranslations("settings");
  const { user, org, accessToken } = useAuth();

  // Profile state
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [locale, setLocale] = useState("en");
  const [theme, setTheme] = useState("system");
  const [timezone, setTimezone] = useState("UTC");
  const [statusText, setStatusText] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Org state
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // API keys state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [creatingKey, setCreatingKey] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [keyDialogOpen, setKeyDialogOpen] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);

  // Webhooks state
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loadingWebhooks, setLoadingWebhooks] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEvents, setWebhookEvents] = useState("");
  const [creatingWebhook, setCreatingWebhook] = useState(false);

  // Email settings state
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailSaved, setEmailSaved] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [resendApiKey, setResendApiKey] = useState("");
  const [emailFromAddress, setEmailFromAddress] = useState("");
  const [emailFromName, setEmailFromName] = useState("");
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // Notification preferences state
  const [emailNotifications, setEmailNotifications] = useState({
    ticket_created: true,
    ticket_status_changed: true,
    ticket_assigned: true,
    ticket_comment: true,
    ticket_resolved: true,
  });
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifSaved, setNotifSaved] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

  // Seed profile form from user context
  useEffect(() => {
    if (user) {
      const meta = (user.user_metadata ?? {}) as Record<string, string | undefined>;
      setDisplayName(meta.display_name ?? user.email ?? "");
      setAvatarUrl(meta.avatar_url ?? "");
      setLocale(meta.locale ?? "en");
      setTheme(meta.theme ?? "system");
      setTimezone(meta.timezone ?? "UTC");
      setStatusText(meta.status_text ?? "");
    }
  }, [user]);

  function authHeaders(): HeadersInit {
    return accessToken ? { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
  }

  async function saveProfile() {
    if (!accessToken) return;
    setSavingProfile(true);
    try {
      await fetch(`${apiUrl}/api/v1/users/me`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ display_name: displayName, avatar_url: avatarUrl, locale, theme, timezone, status_text: statusText }),
      });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } finally {
      setSavingProfile(false);
    }
  }

  async function loadMembers() {
    if (!org?.id || !accessToken || loadingMembers) return;
    setLoadingMembers(true);
    try {
      const res = await fetch(`${apiUrl}/api/v1/orgs/${org.id}/members`, { headers: authHeaders() });
      if (res.ok) setMembers(await res.json());
    } finally {
      setLoadingMembers(false);
    }
  }

  async function loadApiKeys() {
    if (!org?.id || !accessToken || loadingKeys) return;
    setLoadingKeys(true);
    try {
      const res = await fetch(`${apiUrl}/api/v1/orgs/${org.id}/api-keys`, { headers: authHeaders() });
      if (res.ok) {
        const json = await res.json();
        setApiKeys(json.data ?? json);
      }
    } finally {
      setLoadingKeys(false);
    }
  }

  async function createApiKey() {
    if (!org?.id || !accessToken || !newKeyName.trim()) return;
    setCreatingKey(true);
    try {
      const res = await fetch(`${apiUrl}/api/v1/orgs/${org.id}/api-keys`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ name: newKeyName }),
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedKey(data.key ?? data.token ?? null);
        setNewKeyName("");
        await loadApiKeys();
      }
    } finally {
      setCreatingKey(false);
    }
  }

  async function loadWebhooks() {
    if (!org?.id || !accessToken || loadingWebhooks) return;
    setLoadingWebhooks(true);
    try {
      const res = await fetch(`${apiUrl}/api/v1/orgs/${org.id}/webhooks`, { headers: authHeaders() });
      if (res.ok) {
        const json = await res.json();
        setWebhooks(json.data ?? json);
      }
    } finally {
      setLoadingWebhooks(false);
    }
  }

  async function createWebhook() {
    if (!org?.id || !accessToken || !webhookUrl.trim()) return;
    setCreatingWebhook(true);
    try {
      const events = webhookEvents.split(",").map((e) => e.trim()).filter(Boolean);
      const res = await fetch(`${apiUrl}/api/v1/orgs/${org.id}/webhooks`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ url: webhookUrl, events }),
      });
      if (res.ok) {
        setWebhookUrl("");
        setWebhookEvents("");
        await loadWebhooks();
      }
    } finally {
      setCreatingWebhook(false);
    }
  }

  async function loadEmailSettings() {
    if (!org?.id || !accessToken || emailLoading) return;
    setEmailLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/v1/orgs/${org.id}/email-settings`, { headers: authHeaders() });
      if (res.ok) {
        const json = await res.json();
        const d = json.data;
        setHasApiKey(d.has_api_key ?? false);
        setEmailFromAddress(d.email_from_address ?? "");
        setEmailFromName(d.email_from_name ?? "");
        if (d.email_notifications) {
          setEmailNotifications((prev) => ({ ...prev, ...d.email_notifications }));
        }
      }
    } finally {
      setEmailLoading(false);
    }
  }

  async function saveEmailSettings() {
    if (!org?.id || !accessToken) return;
    setEmailSaving(true);
    setEmailError(null);
    setEmailSaved(false);
    try {
      const payload: Record<string, unknown> = {};
      if (resendApiKey.trim()) payload.resend_api_key = resendApiKey.trim();
      if (emailFromAddress.trim()) payload.email_from_address = emailFromAddress.trim();
      if (emailFromName.trim()) payload.email_from_name = emailFromName.trim();

      if (Object.keys(payload).length === 0) {
        setEmailError("Please fill in at least one field to save.");
        return;
      }

      const res = await fetch(`${apiUrl}/api/v1/orgs/${org.id}/email-settings`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setEmailSaved(true);
        if (resendApiKey.trim()) {
          setHasApiKey(true);
          setResendApiKey("");
        }
        setTimeout(() => setEmailSaved(false), 2500);
      } else {
        const err = await res.json().catch(() => null);
        setEmailError(err?.error?.message ?? `Save failed (${res.status}). Check your API key and try again.`);
      }
    } catch (e) {
      setEmailError("Network error — could not reach the API.");
    } finally {
      setEmailSaving(false);
    }
  }

  async function sendTestEmail() {
    if (!org?.id || !accessToken || !testEmailAddress.trim()) return;
    setSendingTest(true);
    setTestResult(null);
    try {
      const res = await fetch(`${apiUrl}/api/v1/orgs/${org.id}/email-settings/test`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ to: testEmailAddress.trim() }),
      });
      const json = await res.json();
      setTestResult(res.ok ? json.message : (json.error?.message ?? "Failed to send test email"));
    } finally {
      setSendingTest(false);
    }
  }

  async function removeResendApiKey() {
    if (!org?.id || !accessToken) return;
    const res = await fetch(`${apiUrl}/api/v1/orgs/${org.id}/email-settings/api-key`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (res.ok) {
      setHasApiKey(false);
      setResendApiKey("");
    }
  }

  async function saveNotificationPreferences() {
    if (!org?.id || !accessToken) return;
    setNotifSaving(true);
    try {
      const res = await fetch(`${apiUrl}/api/v1/orgs/${org.id}/email-settings`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ email_notifications: emailNotifications }),
      });
      if (res.ok) {
        setNotifSaved(true);
        setTimeout(() => setNotifSaved(false), 2500);
      }
    } finally {
      setNotifSaving(false);
    }
  }

  async function toggleWebhook(webhook: Webhook) {
    if (!org?.id || !accessToken) return;
    await fetch(`${apiUrl}/api/v1/orgs/${org.id}/webhooks/${webhook.id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ is_active: !webhook.is_active }),
    });
    setWebhooks((prev) => prev.map((w) => w.id === webhook.id ? { ...w, is_active: !w.is_active } : w));
  }

  function copyKey() {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
      setKeyCopied(true);
      setTimeout(() => setKeyCopied(false), 2000);
    }
  }

  const initials = (name?: string | null) =>
    name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">{t("title")}</h1>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">{t("profile")}</TabsTrigger>
          <TabsTrigger value="organization" onFocus={loadMembers} onClick={loadMembers}>
            {t("organization")}
          </TabsTrigger>
          <TabsTrigger value="apiKeys" onFocus={loadApiKeys} onClick={loadApiKeys}>
            {t("apiKeys")}
          </TabsTrigger>
          <TabsTrigger value="webhooks" onFocus={loadWebhooks} onClick={loadWebhooks}>
            {t("webhooks")}
          </TabsTrigger>
          <TabsTrigger value="email" onFocus={loadEmailSettings} onClick={loadEmailSettings}>
            {t("email")}
          </TabsTrigger>
          <TabsTrigger value="notifications" onFocus={loadEmailSettings} onClick={loadEmailSettings}>
            {t("notifications")}
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>{t("profile")}</CardTitle>
              <CardDescription>Update your personal information and preferences.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback>{initials(displayName || user?.email)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    {t("avatarUrl")}
                  </label>
                  <Input
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {t("displayName")}
                </label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    {t("locale")}
                  </label>
                  <Input
                    value={locale}
                    onChange={(e) => setLocale(e.target.value)}
                    placeholder="en"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    {t("theme")}
                  </label>
                  <Input
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    placeholder="system"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {t("timezone")}
                </label>
                <Input
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  placeholder="UTC"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {t("statusText")}
                </label>
                <Input
                  value={statusText}
                  onChange={(e) => setStatusText(e.target.value)}
                  placeholder="What's on your mind?"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button onClick={saveProfile} disabled={savingProfile}>
                  {savingProfile ? "Saving..." : t("saveProfile")}
                </Button>
                {profileSaved && (
                  <span className="text-sm text-green-600">Saved!</span>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Organization Tab */}
        <TabsContent value="organization">
          <Card>
            <CardHeader>
              <CardTitle>{t("organization")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-text-secondary">Name</span>
                  <p className="mt-1 text-text-primary font-medium">{org?.name ?? "—"}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-text-secondary">Slug</span>
                  <p className="mt-1 font-mono text-sm text-text-primary">{org?.slug ?? "—"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-text-secondary">{t("plan")}</span>
                <Badge variant="secondary" className="capitalize">
                  {org?.plan ?? "free"}
                </Badge>
              </div>

              <div className="pt-2">
                <h3 className="text-sm font-semibold text-text-primary mb-3">
                  {t("members")}
                </h3>
                {loadingMembers ? (
                  <p className="text-sm text-text-secondary">Loading members...</p>
                ) : members.length === 0 ? (
                  <p className="text-sm text-text-secondary">No members loaded yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {members.map((m) => (
                      <li key={m.id} className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={m.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {initials(m.display_name || m.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">
                            {m.display_name ?? m.email ?? m.id}
                          </p>
                          {m.email && m.display_name && (
                            <p className="text-xs text-text-secondary truncate">{m.email}</p>
                          )}
                        </div>
                        {m.role && (
                          <Badge variant="outline" className="text-xs capitalize shrink-0">
                            {m.role}
                          </Badge>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="apiKeys">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t("apiKeys")}</CardTitle>
                <CardDescription>Manage API keys for programmatic access.</CardDescription>
              </div>
              <Dialog open={keyDialogOpen} onOpenChange={(v) => { setKeyDialogOpen(v); if (!v) setGeneratedKey(null); }}>
                <DialogTrigger asChild>
                  <Button size="sm">{t("createApiKey")}</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t("createApiKey")}</DialogTitle>
                  </DialogHeader>
                  {generatedKey ? (
                    <div className="space-y-4">
                      <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
                        <p className="text-sm font-medium text-amber-800">{t("apiKeyWarning")}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input value={generatedKey} readOnly className="font-mono text-xs" />
                        <Button size="sm" onClick={copyKey} variant="outline">
                          {keyCopied ? "Copied!" : "Copy"}
                        </Button>
                      </div>
                      <Button onClick={() => { setKeyDialogOpen(false); setGeneratedKey(null); }}>
                        Done
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">
                          {t("keyName")}
                        </label>
                        <Input
                          value={newKeyName}
                          onChange={(e) => setNewKeyName(e.target.value)}
                          placeholder="My API Key"
                        />
                      </div>
                      <Button onClick={createApiKey} disabled={creatingKey || !newKeyName.trim()}>
                        {creatingKey ? "Creating..." : t("createApiKey")}
                      </Button>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {loadingKeys ? (
                <p className="text-sm text-text-secondary">Loading keys...</p>
              ) : apiKeys.length === 0 ? (
                <p className="text-sm text-text-secondary">{t("noApiKeys")}</p>
              ) : (
                <ul className="divide-y divide-border-subtle">
                  {apiKeys.map((key) => (
                    <li key={key.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium text-text-primary">{key.name}</p>
                        <p className="text-xs text-text-secondary font-mono mt-0.5">
                          {key.key_prefix}••••••••
                        </p>
                      </div>
                      <p className="text-xs text-text-secondary">
                        {new Date(key.created_at).toLocaleDateString()}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks">
          <Card>
            <CardHeader>
              <CardTitle>{t("webhooks")}</CardTitle>
              <CardDescription>Receive real-time event notifications via HTTP POST.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Create webhook form */}
              <div className="space-y-3 rounded-md border border-border-subtle p-4">
                <h3 className="text-sm font-semibold text-text-primary">{t("createWebhook")}</h3>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    {t("webhookUrl")}
                  </label>
                  <Input
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://your-server.com/webhook"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    {t("webhookEvents")}
                  </label>
                  <Input
                    value={webhookEvents}
                    onChange={(e) => setWebhookEvents(e.target.value)}
                    placeholder="ticket.created, message.sent"
                  />
                </div>
                <Button
                  onClick={createWebhook}
                  disabled={creatingWebhook || !webhookUrl.trim()}
                  size="sm"
                >
                  {creatingWebhook ? "Creating..." : t("createWebhook")}
                </Button>
              </div>

              {/* Webhook list */}
              {loadingWebhooks ? (
                <p className="text-sm text-text-secondary">Loading webhooks...</p>
              ) : webhooks.length === 0 ? (
                <p className="text-sm text-text-secondary">{t("noWebhooks")}</p>
              ) : (
                <ul className="divide-y divide-border-subtle">
                  {webhooks.map((wh) => (
                    <li key={wh.id} className="flex items-start justify-between py-3 gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-text-primary truncate">{wh.url}</p>
                        <p className="text-xs text-text-secondary mt-0.5">
                          {wh.events.join(", ") || "All events"}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleWebhook(wh)}
                        className={`shrink-0 text-xs px-2 py-1 rounded-full font-medium transition-colors ${
                          wh.is_active
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-surface-tertiary text-text-secondary hover:bg-surface-secondary"
                        }`}
                      >
                        {wh.is_active ? "Active" : "Inactive"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        {/* Email Settings Tab */}
        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle>{t("email")}</CardTitle>
              <CardDescription>{t("emailDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {emailLoading ? (
                <p className="text-sm text-text-secondary">Loading email settings...</p>
              ) : (
                <>
                  {/* API Key section */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-text-primary">{t("resendApiKey")}</h3>
                    {hasApiKey ? (
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="inline-flex items-center gap-1.5 text-sm text-green-700 bg-green-50 px-3 py-1.5 rounded-md">
                            <span className="w-2 h-2 rounded-full bg-green-500" />
                            {t("apiKeyConfigured")}
                          </span>
                        </div>
                        <Button size="sm" variant="outline" onClick={removeResendApiKey}>
                          {t("removeApiKey")}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Input
                          type="password"
                          value={resendApiKey}
                          onChange={(e) => setResendApiKey(e.target.value)}
                          placeholder="re_..."
                        />
                        <p className="text-xs text-text-secondary">
                          {t("apiKeyHint")}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* From address */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-text-primary">
                      {t("fromAddress")}
                    </label>
                    <Input
                      value={emailFromAddress}
                      onChange={(e) => setEmailFromAddress(e.target.value)}
                      placeholder="support@yourcompany.com"
                    />
                  </div>

                  {/* From name */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-text-primary">
                      {t("fromName")}
                    </label>
                    <Input
                      value={emailFromName}
                      onChange={(e) => setEmailFromName(e.target.value)}
                      placeholder="Acme Support"
                    />
                  </div>

                  {/* Save button */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center gap-3">
                      <Button onClick={saveEmailSettings} disabled={emailSaving}>
                        {emailSaving ? "Saving..." : t("saveEmailSettings")}
                      </Button>
                      {emailSaved && (
                        <span className="text-sm text-green-600">Saved!</span>
                      )}
                    </div>
                    {emailError && (
                      <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2">
                        <p className="text-sm text-red-700">{emailError}</p>
                      </div>
                    )}
                  </div>

                  {/* Test email */}
                  {hasApiKey && (
                    <div className="space-y-3 rounded-md border border-border-subtle p-4 mt-4">
                      <h3 className="text-sm font-semibold text-text-primary">{t("testEmail")}</h3>
                      <div className="flex gap-2">
                        <Input
                          value={testEmailAddress}
                          onChange={(e) => setTestEmailAddress(e.target.value)}
                          placeholder="you@example.com"
                          className="flex-1"
                        />
                        <Button
                          size="sm"
                          onClick={sendTestEmail}
                          disabled={sendingTest || !testEmailAddress.trim()}
                        >
                          {sendingTest ? "Sending..." : t("sendTestEmail")}
                        </Button>
                      </div>
                      {testResult && (
                        <p className="text-sm text-text-secondary">{testResult}</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>{t("notifications")}</CardTitle>
              <CardDescription>{t("notificationsDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {emailLoading ? (
                <p className="text-sm text-text-secondary">Loading notification preferences...</p>
              ) : !hasApiKey ? (
                <div className="rounded-md bg-amber-50 border border-amber-200 p-4">
                  <p className="text-sm text-amber-800">
                    {t("configureEmailFirst")}
                  </p>
                </div>
              ) : (
                <>
                  {(
                    [
                      { key: "ticket_created", label: t("notifTicketCreated") },
                      { key: "ticket_status_changed", label: t("notifTicketStatusChanged") },
                      { key: "ticket_assigned", label: t("notifTicketAssigned") },
                      { key: "ticket_comment", label: t("notifTicketComment") },
                      { key: "ticket_resolved", label: t("notifTicketResolved") },
                    ] as const
                  ).map(({ key, label }) => (
                    <label
                      key={key}
                      className="flex items-center justify-between py-2 border-b border-border-subtle last:border-0"
                    >
                      <span className="text-sm text-text-primary">{label}</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={emailNotifications[key]}
                        onClick={() =>
                          setEmailNotifications((prev) => ({
                            ...prev,
                            [key]: !prev[key],
                          }))
                        }
                        className={`relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                          emailNotifications[key]
                            ? "bg-blue-600"
                            : "bg-surface-tertiary"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                            emailNotifications[key]
                              ? "translate-x-5"
                              : "translate-x-1"
                          }`}
                        />
                      </button>
                    </label>
                  ))}

                  <div className="flex items-center gap-3 pt-4">
                    <Button onClick={saveNotificationPreferences} disabled={notifSaving}>
                      {notifSaving ? "Saving..." : t("saveNotifications")}
                    </Button>
                    {notifSaved && (
                      <span className="text-sm text-green-600">Saved!</span>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
