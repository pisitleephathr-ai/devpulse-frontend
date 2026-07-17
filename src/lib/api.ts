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

const TIMEOUT_MS = 20_000;

/** fetch with an abort-based timeout so a hung connection can't spin forever. */
async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Normalize a fetch/timeout failure (no HTTP response) into an ApiError. */
function networkError(err: unknown): ApiError {
  const aborted = err instanceof DOMException && err.name === "AbortError";
  return new ApiError(
    aborted
      ? "การเชื่อมต่อหมดเวลา กรุณาลองใหม่อีกครั้ง"
      : "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต",
    0
  );
}

async function request<T>(path: string, opts: Options = {}): Promise<T> {
  const { method = "GET", body, auth = true } = opts;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const url = `${API_URL}${path}`;
  const init: RequestInit = {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };

  let res: Response;
  try {
    res = await fetchWithTimeout(url, init);
  } catch (err) {
    // Retry idempotent GETs once on a network failure / timeout.
    if (method === "GET") {
      try {
        res = await fetchWithTimeout(url, init);
      } catch {
        throw networkError(err);
      }
    } else {
      throw networkError(err);
    }
  }

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
