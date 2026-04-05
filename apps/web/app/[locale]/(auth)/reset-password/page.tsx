"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Extract access_token from URL hash (Supabase recovery link format)
  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const token = params.get("access_token");
    if (token) {
      setAccessToken(token);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!accessToken) {
      setError("Missing recovery token. Please use the link from your email.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${baseUrl}/api/v1/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error ?? "Something went wrong");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push(`/${locale}/login`), 2000);
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
          {t("resetPassword")}
        </p>
      </div>

      {success ? (
        <div className="space-y-4">
          <div className="rounded-radius-sm bg-accent/10 p-3 text-sm text-accent">
            {t("passwordUpdated")}
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
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-text-primary"
            >
              {t("newPassword")}
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
            disabled={loading || !accessToken}
            className="w-full rounded-radius-sm bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors duration-fast hover:bg-accent-hover active:bg-accent-active disabled:opacity-50"
          >
            {loading ? "..." : t("resetPassword")}
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
