"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import type { WikiPage } from "@ollo-dev/shared/types";

interface PageEditorProps {
  page: WikiPage;
  onCancel: () => void;
  onSaved: (updated: WikiPage) => void;
}

export function PageEditor({ page, onCancel, onSaved }: PageEditorProps) {
  const t = useTranslations("wiki");
  const tCommon = useTranslations("common");
  const { org, accessToken } = useAuth();
  const orgId = org?.id;
  const [title, setTitle] = useState(page.title);
  const [content, setContent] = useState(page.content);
  const [changeNote, setChangeNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !orgId || !accessToken) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/wiki/pages/${page.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({
            title,
            content,
            change_note: changeNote || undefined,
          }),
        }
      );
      if (!res.ok) throw new Error("Failed to save page");
      const json = await res.json();
      onSaved(json.data ?? json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border-subtle bg-surface-primary shrink-0">
        <h2 className="text-sm font-semibold text-text-primary">{t("editPage")}</h2>
        <div className="flex items-center gap-2">
          {error && <p className="text-xs text-red-600">{error}</p>}
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={saving}>
            {t("cancelEdit")}
          </Button>
          <Button type="submit" size="sm" disabled={saving || !title.trim()}>
            {saving ? "Saving..." : t("savePage")}
          </Button>
        </div>
      </div>

      {/* Title */}
      <div className="px-6 pt-4 pb-2 shrink-0">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Page title"
          className="text-lg font-semibold border-0 border-b border-border-subtle rounded-none px-0 focus:ring-0 focus:border-accent"
          required
          disabled={saving}
        />
      </div>

      {/* Content */}
      <div className="flex-1 px-6 pb-2 overflow-hidden flex flex-col">
        <textarea
          className="flex-1 w-full resize-none text-sm text-text-primary placeholder:text-text-secondary focus:outline-none bg-transparent font-mono leading-relaxed"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your content here..."
          disabled={saving}
        />
      </div>

      {/* Change note */}
      <div className="px-6 py-3 border-t border-border-subtle bg-surface-secondary shrink-0">
        <Input
          value={changeNote}
          onChange={(e) => setChangeNote(e.target.value)}
          placeholder={t("changeNote")}
          className="text-sm"
          disabled={saving}
        />
      </div>
    </form>
  );
}
