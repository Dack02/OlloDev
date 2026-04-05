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

const ACTIVE_ORG_STORAGE_KEY = "ollo-dev.active-org-id";

type OrgWithMembership = Org & {
  membership?: {
    org_id?: string;
    role?: string;
    joined_at?: string;
  };
};

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

  const pickOrg = useCallback((orgs: OrgWithMembership[]) => {
    if (orgs.length === 0) return null;

    const storedOrgId =
      typeof window !== "undefined"
        ? window.localStorage.getItem(ACTIVE_ORG_STORAGE_KEY)
        : null;

    if (storedOrgId) {
      const storedOrg = orgs.find((candidate) => candidate.id === storedOrgId);
      if (storedOrg) return storedOrg;
    }

    const [firstOrg] = [...orgs].sort((a, b) => {
      const aJoinedAt = a.membership?.joined_at ?? "";
      const bJoinedAt = b.membership?.joined_at ?? "";
      if (aJoinedAt !== bJoinedAt) return aJoinedAt.localeCompare(bJoinedAt);
      return a.name.localeCompare(b.name);
    });

    return firstOrg ?? null;
  }, []);

  const persistOrg = useCallback((nextOrg: Org | null) => {
    if (typeof window === "undefined") return;
    if (nextOrg) {
      window.localStorage.setItem(ACTIVE_ORG_STORAGE_KEY, nextOrg.id);
    } else {
      window.localStorage.removeItem(ACTIVE_ORG_STORAGE_KEY);
    }
  }, []);

  const fetchOrg = useCallback(async (token: string) => {
    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${baseUrl}/api/v1/orgs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const json = await res.json();
      const orgs: OrgWithMembership[] = json.data ?? [];
      return pickOrg(orgs);
    } catch {
      return null;
    }
  }, [pickOrg]);

  const loadSession = useCallback(async () => {
    setLoading(true);
    try {
      let {
        data: { session },
      } = await supabase.auth.getSession();

      // getSession() returns the cached token without validating it.
      // If it's expired (or close), refresh before using it.
      if (session) {
        try {
          const payload = JSON.parse(atob(session.access_token.split('.')[1]));
          if (Date.now() > payload.exp * 1000 - 60_000) {
            const { data } = await supabase.auth.refreshSession();
            session = data.session;
          }
        } catch {
          const { data } = await supabase.auth.refreshSession();
          session = data.session;
        }
      }

      if (session) {
        setUser(session.user);
        setAccessToken(session.access_token);
        const fetchedOrg = await fetchOrg(session.access_token);
        setOrg(fetchedOrg);
        persistOrg(fetchedOrg);
      } else {
        setUser(null);
        setAccessToken(null);
        setOrg(null);
        persistOrg(null);
      }
    } finally {
      setLoading(false);
    }
  }, [supabase, fetchOrg, persistOrg]);

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
        persistOrg(fetchedOrg);
      } else {
        setUser(null);
        setAccessToken(null);
        setOrg(null);
        persistOrg(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, loadSession, fetchOrg, persistOrg]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setOrg(null);
    setAccessToken(null);
    persistOrg(null);
  }, [supabase, persistOrg]);

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
