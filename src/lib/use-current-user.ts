"use client";

import { useEffect, useState } from "react";
import { getStoredUser, type AuthUser } from "./auth";

/**
 * The logged-in user from localStorage. Returns null on the first render
 * (SSR/hydration-safe) then the real user after mount.
 */
export function useCurrentUser(): AuthUser | null {
  const [user, setUser] = useState<AuthUser | null>(null);
  useEffect(() => {
    // Read the external store (localStorage) once after mount. Doing this in
    // an effect (not render) keeps SSR/hydration consistent.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(getStoredUser());
  }, []);
  return user;
}
