import { API_URL } from "./config";
import { getToken, clearSession } from "./auth";

/** Error thrown for any non-2xx API response. */
export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

type Options = {
  method?: string;
  body?: unknown;
  /** Skip attaching the Authorization header (used by login/register). */
  auth?: boolean;
};

async function request<T>(path: string, opts: Options = {}): Promise<T> {
  const { method = "GET", body, auth = true } = opts;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Session expired / invalid — clear and bounce to login with a flag so the
  // login page can explain why the user landed there.
  if (res.status === 401 && typeof window !== "undefined") {
    const hadToken = !!getToken();
    clearSession();
    if (!window.location.pathname.startsWith("/login")) {
      if (hadToken) window.sessionStorage.setItem("devpulse_session_expired", "1");
      window.location.href = "/login";
    }
  }

  if (!res.ok) {
    let payload: { error?: string; details?: unknown } | undefined;
    try {
      payload = await res.json();
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(
      payload?.error || `คำขอล้มเหลว (${res.status})`,
      res.status,
      payload?.details
    );
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown, auth = true) =>
    request<T>(path, { method: "POST", body, auth }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
