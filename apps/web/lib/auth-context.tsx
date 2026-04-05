"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import type { Org } from "@ollo-dev/shared/types";
import { createClient } from "@/lib/supabase/client";

// ============================================================
// Types
// ============================================================

interface AuthContextValue {
  user: User | null;
  org: Org | null;
  accessToken: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

// ============================================================
// Context
// ============================================================

const AuthContext = createContext<AuthContextValue | null>(null);

// ============================================================
// Provider
// ============================================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [org, setOrg] = useState<Org | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const fetchOrg = useCallback(async (token: string) => {
    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${baseUrl}/api/v1/orgs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const json = await res.json();
      // Use the first org the user belongs to
      const orgs: Org[] = json.data ?? [];
      return orgs[0] ?? null;
    } catch {
      return null;
    }
  }, []);

  const loadSession = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        setUser(session.user);
        setAccessToken(session.access_token);
        const fetchedOrg = await fetchOrg(session.access_token);
        setOrg(fetchedOrg);
      } else {
        setUser(null);
        setAccessToken(null);
        setOrg(null);
      }
    } finally {
      setLoading(false);
    }
  }, [supabase, fetchOrg]);

  useEffect(() => {
    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setUser(session.user);
        setAccessToken(session.access_token);
        const fetchedOrg = await fetchOrg(session.access_token);
        setOrg(fetchedOrg);
      } else {
        setUser(null);
        setAccessToken(null);
        setOrg(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, loadSession, fetchOrg]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setOrg(null);
    setAccessToken(null);
  }, [supabase]);

  return (
    <AuthContext.Provider value={{ user, org, accessToken, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================
// Hook
// ============================================================

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
