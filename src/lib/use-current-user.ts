"use client";

import { useEffect, useState } from "react";
import { getStoredUser, subscribeAuth, type AuthUser } from "./auth";

/**
 * The logged-in user from localStorage. Returns null on the first render
 * (SSR/hydration-safe) then the real user after mount. Re-reads whenever the
 * session changes (login / profile update / logout).
 */
export function useCurrentUser(): AuthUser | null {
  const [user, setUser] = useState<AuthUser | null>(null);
  useEffect(() => {
    const update = () => setUser(getStoredUser());
    update();
    return subscribeAuth(update);
  }, []);
  return user;
}
