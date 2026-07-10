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

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
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

export function setSession(token: string, user: AuthUser) {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  notifyAuthChange();
}

/** Update the stored user (keeps the token) and notify subscribers. */
export function updateStoredUser(user: AuthUser) {
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  notifyAuthChange();
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  notifyAuthChange();
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
