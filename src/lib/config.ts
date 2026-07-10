/**
 * Base URL of the DevPulse backend API.
 *
 * Priority: NEXT_PUBLIC_API_URL (set per-environment in Vercel / .env.local) →
 * the production Railway URL below as a safe fallback. Local dev overrides this
 * via .env.local (http://localhost:4000).
 *
 * NOTE: Railway auto-generates the "*.up.railway.app" subdomain, and it can
 * change if the service loses its generated domain. If the API becomes
 * unreachable, confirm the current URL with `railway domain` and update both
 * the Vercel env var and this fallback.
 */
const PROD_API_URL = "https://devpulse-backend-production-ffb4.up.railway.app";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || PROD_API_URL;
