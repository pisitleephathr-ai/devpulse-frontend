"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, updateStoredUser, type AuthUser } from "@/lib/auth";
import { api } from "@/lib/api";

/** Client-side gate: redirect to /login when there's no JWT. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true);
    // Refresh the stored user from the server so role / permission changes made
    // since login (e.g. an admin granting a capability) take effect on next load
    // without requiring a full re-login.
    api
      .get<{ user: AuthUser | null }>("/api/auth/me")
      .then((r) => {
        if (r.user) updateStoredUser(r.user);
      })
      .catch(() => {});
  }, [router]);

  if (!ready) return null;
  return <>{children}</>;
}
