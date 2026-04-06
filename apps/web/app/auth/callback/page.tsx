"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Auth callback page — handles the #access_token hash fragment from Supabase
 * invite/magic-link redirects. The Supabase client automatically picks up the
 * token from the hash and establishes the session.
 *
 * For invite flows (type=invite in hash), redirects to set-password page.
 * For other flows, redirects to the dashboard.
 */
export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // Persist org_id from query params so auth-context picks the right org
    const searchParams = new URLSearchParams(window.location.search);
    const orgId = searchParams.get("org_id");
    if (orgId) {
      window.localStorage.setItem("ollo-dev.active-org-id", orgId);
    }

    // Check the hash fragment for the flow type before Supabase clears it
    const hashParams = new URLSearchParams(
      window.location.hash.substring(1)
    );
    const flowType = hashParams.get("type");

    const supabase = createClient();

    supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        if (flowType === "invite") {
          // Invited user needs to set a password before using the app
          router.replace("/en/set-password");
        } else {
          router.replace("/en/threads");
        }
      }
    });

    // Fallback: if no session after 5s, send to login
    const timeout = setTimeout(() => {
      router.replace("/en/login");
    }, 5000);

    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-gray-500">Signing you in...</p>
    </div>
  );
}
