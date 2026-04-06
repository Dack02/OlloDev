"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push(`/${locale}/threads`);
    router.refresh();
  }

  return (
    <div className="rounded-radius-lg bg-surface-primary p-8 shadow-lg">
      <div className="mb-8 text-center">
        <h1 className="text-text-primary text-2xl font-semibold tracking-tight">
          Ollo Dev
        </h1>
        <p className="mt-2 text-text-secondary text-sm">
          {t("login")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-radius-sm bg-error/10 p-3 text-sm text-error">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-text-primary">
            {t("email")}
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-radius-sm border border-border-default bg-surface-primary px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary outline-none transition-colors duration-fast focus:border-accent focus:ring-1 focus:ring-accent"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-text-primary">
            {t("password")}
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-radius-sm border border-border-default bg-surface-primary px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary outline-none transition-colors duration-fast focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>

        <div className="flex justify-end">
          <Link href={`/${locale}/forgot-password`} className="text-xs text-accent hover:text-accent-hover">
            {t("forgotPassword")}
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-radius-sm bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors duration-fast hover:bg-accent-hover active:bg-accent-active disabled:opacity-50"
        >
          {loading ? "..." : t("login")}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-text-secondary">
        {t("noAccount")}{" "}
        <Link href={`/${locale}/signup`} className="font-medium text-accent hover:text-accent-hover">
          {t("signup")}
        </Link>
      </div>
    </div>
  );
}
