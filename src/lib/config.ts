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

// Railway retired the service's previous auto-generated subdomain(s). If a stale
// build-time env var (e.g. Vercel's NEXT_PUBLIC_API_URL) still points at a dead
// host, transparently redirect to the current URL so production isn't broken by
// an env var that can't be edited from the codebase. Remove entries here once
// the env var is corrected.
const DEAD_API_HOSTS = ["devpulse-backend-production-a216.up.railway.app"];

const configured =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || PROD_API_URL;

export const API_URL = DEAD_API_HOSTS.some((h) => configured.includes(h))
  ? PROD_API_URL
  : configured;
