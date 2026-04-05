"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${baseUrl}/api/v1/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error ?? "Something went wrong");
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError("Something went wrong");
    } finally {
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
          {t("forgotPassword")}
        </p>
      </div>

      {success ? (
        <div className="space-y-4">
          <div className="rounded-radius-sm bg-accent/10 p-3 text-sm text-accent">
            {t("resetSuccess")}
          </div>
          <Link
            href={`/${locale}/login`}
            className="block text-center text-sm font-medium text-accent hover:text-accent-hover"
          >
            {t("backToLogin")}
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-radius-sm bg-error/10 p-3 text-sm text-error">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-text-primary"
            >
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

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-radius-sm bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors duration-fast hover:bg-accent-hover active:bg-accent-active disabled:opacity-50"
          >
            {loading ? "..." : t("sendResetLink")}
          </button>

          <div className="text-center">
            <Link
              href={`/${locale}/login`}
              className="text-sm font-medium text-accent hover:text-accent-hover"
            >
              {t("backToLogin")}
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
