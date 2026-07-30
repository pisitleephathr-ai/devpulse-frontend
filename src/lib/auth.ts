/** JWT storage helpers (client-side, localStorage). No auth logic beyond token I/O. */

const TOKEN_KEY = "devpulse_token";
const USER_KEY = "devpulse_user";

import type { ApiRole } from "./mappers";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  /** role object (new API) or legacy enum string */
  role: ApiRole | string | null;
  avatarKey: string;
  active: boolean;
};

// Session lives in localStorage when "remember me" is on (persists across
// browser restarts) or sessionStorage when off (cleared when the tab closes).
// Reads check both so the rest of the app doesn't care which one holds it.
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    window.localStorage.getItem(TOKEN_KEY) ??
    window.sessionStorage.getItem(TOKEN_KEY)
  );
}

function tokenStore(): Storage {
  return window.localStorage.getItem(TOKEN_KEY) !== null
    ? window.localStorage
    : window.sessionStorage;
}

// Lightweight pub/sub so the header/sidebar react to auth/profile changes.
const listeners = new Set<() => void>();
export function subscribeAuth(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function notifyAuthChange() {
  listeners.forEach((l) => l());
}

export function setSession(token: string, user: AuthUser, remember = true) {
  const target = remember ? window.localStorage : window.sessionStorage;
  const other = remember ? window.sessionStorage : window.localStorage;
  // Never leave a stale copy in the other store.
  other.removeItem(TOKEN_KEY);
  other.removeItem(USER_KEY);
  target.setItem(TOKEN_KEY, token);
  target.setItem(USER_KEY, JSON.stringify(user));
  notifyAuthChange();
}

/** Update the stored user (keeps the token in whichever store holds it). */
export function updateStoredUser(user: AuthUser) {
  tokenStore().setItem(USER_KEY, JSON.stringify(user));
  notifyAuthChange();
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw =
    window.localStorage.getItem(USER_KEY) ??
    window.sessionStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  for (const s of [window.localStorage, window.sessionStorage]) {
    s.removeItem(TOKEN_KEY);
    s.removeItem(USER_KEY);
  }
  notifyAuthChange();
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
