# Security Checklist

## Authentication
- [x] JWT with `JWT_SECRET` (env-validated, ≥ 16 chars) and `JWT_EXPIRES_IN`
- [x] `authenticate` middleware verifies the Bearer token and re-reads the user's role from the DB each request (revocation/role changes take effect immediately)
- [x] Login/register throttled with `express-rate-limit` (20 / 15 min / IP)
- [x] `401` on missing/invalid/expired token; frontend clears session + redirects

## Passwords
- [x] Hashed with bcrypt; never stored or returned in plaintext
- [x] `serializeUser` / selects never expose the `password` field
- [x] Change-password requires the current password; profile reminder to rotate defaults
- [ ] (Ops) rotate the seeded `password123` for real accounts

## RBAC / authorization (enforced server-side, not just hidden in UI)
- [x] `authorize(...roles)` on management routes; ownership checks in controllers
- [x] `403` for authenticated-but-unauthorized; unauthorized users can't reach restricted records by changing the URL or calling the API
- Endpoint guards:
  - `/api/users`, `/api/roles` — write = ADMIN
  - `/api/projects` — create/edit/archive = MANAGER/ADMIN; hard delete = ADMIN
  - `/api/activity` — MANAGER/ADMIN
  - `/api/leaves/:id/approve|reject` — MANAGER/ADMIN, **not own** (ADMIN override); `getLeave` scoped to owner/manager
  - `/api/tasks` — create/delete = MANAGER/ADMIN; edit = manager/admin or an assignee
  - `/api/reports` — edit/delete = author or manager/admin
  - `/api/search` — auth required; leaves scoped to the requester unless manager/admin

## Transport & input
- [x] `helmet` security headers
- [x] CORS from `CORS_ORIGIN` (the Vercel domain in prod, not `*`)
- [x] Zod validation on all write endpoints
- [x] 1 MB JSON body limit; `trust proxy` for correct client IPs
- [x] Malformed JSON → 400 (not 500)

## Data exposure & errors
- [x] Central error handler returns safe messages; unknown errors log server-side and return a generic 500 (no stack traces to clients)
- [x] No secrets in responses or client bundles (only `NEXT_PUBLIC_*` is exposed to the browser)
- [x] Prisma known errors mapped to 409/404 without leaking internals

## Data safety
- [x] Migrations additive; no destructive prod commands (`migrate reset` / `db push`) in the deploy path
- [x] Soft delete/archive preferred over hard delete for tasks-comments and projects

## Recommended next
- [ ] Per-user "must change password on first login" flag
- [ ] Refresh-token rotation / shorter access-token TTL
- [ ] Audit-log retention policy; alerting on repeated 401/403 bursts
