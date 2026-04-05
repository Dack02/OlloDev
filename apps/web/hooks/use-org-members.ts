"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";

interface OrgMember {
  display_name: string;
  email: string;
}

export function useOrgMembers(): Map<string, OrgMember> {
  const { org, accessToken } = useAuth();
  const orgId = org?.id;
  const [members, setMembers] = useState<Map<string, OrgMember>>(new Map());
  const fetchedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!orgId || !accessToken || fetchedRef.current === orgId) return;
    fetchedRef.current = orgId;

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/orgs/${orgId}/members`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!json?.data) return;
        const map = new Map<string, OrgMember>();
        for (const m of json.data) {
          map.set(m.user_id ?? m.id, {
            display_name: m.display_name ?? m.full_name ?? m.email ?? "Unknown",
            email: m.email ?? "",
          });
        }
        setMembers(map);
      })
      .catch(() => {});
  }, [orgId, accessToken]);

  return members;
}
