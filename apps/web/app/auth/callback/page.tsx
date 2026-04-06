"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Auth callback page — handles the #access_token hash fragment from Supabase
 * invite/magic-link redirects. The Supabase client automatically picks up the
 * token from the hash and establishes the session. We then redirect to the app.
 */
export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        // Session established — redirect to dashboard
        router.replace("/en/threads");
      }
    });

    // If the hash contains an access_token, Supabase client will process it
    // automatically via the onAuthStateChange listener above.
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
