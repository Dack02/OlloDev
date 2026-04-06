"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SetPasswordPage() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: updateErr } = await supabase.auth.updateUser({
        password,
      });

      if (updateErr) {
        setError(updateErr.message);
        setLoading(false);
        return;
      }

      router.replace(`/${locale}/threads`);
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="rounded-radius-lg bg-surface-primary p-8 shadow-lg">
      <div className="mb-8 text-center">
        <h1 className="text-text-primary text-2xl font-semibold tracking-tight">
          Ollo Dev
        </h1>
        <p className="mt-2 text-text-secondary text-sm">
          {t("setPassword")}
        </p>
      </div>

      <p className="mb-6 text-sm text-text-secondary text-center">
        {t("setPasswordSubtext")}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-radius-sm bg-error/10 p-3 text-sm text-error">
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-medium text-text-primary"
          >
            {t("password")}
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full rounded-radius-sm border border-border-default bg-surface-primary px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary outline-none transition-colors duration-fast focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-radius-sm bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors duration-fast hover:bg-accent-hover active:bg-accent-active disabled:opacity-50"
        >
          {loading ? "..." : t("setPasswordButton")}
        </button>
      </form>
    </div>
  );
}
