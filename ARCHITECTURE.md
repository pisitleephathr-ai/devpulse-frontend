# Architecture

## Overview

DevPulse is a two-tier app: a Next.js frontend (Vercel) talking to an Express + Prisma REST API (Railway) backed by PostgreSQL. Both repos auto-deploy from GitHub `main`.

```
Browser ──HTTPS──> Next.js (Vercel) ──REST/JWT──> Express API (Railway) ──> PostgreSQL (Railway)
```

## Frontend (`devpulse-fontend`)

- **Next.js App Router**, TypeScript, Tailwind CSS v4 (CSS-first `@theme`, class-based dark mode).
- **Routing**: `src/app/(app)/*` are the authed pages; `/login` and `/` (landing) are public.
- **Shell**: `AppShell` (client) renders `Sidebar` (static on desktop, drawer on mobile), `Header`, and a `PageTransition`-wrapped `<main>`.
- **Data**: a Context store (`src/lib/store.tsx`, `useData`) fetches all entities once from the API and exposes CRUD methods; pages filter client-side over already-RBAC-scoped data. Some pages (dashboard, activity, calendar, projects) fetch their own endpoints directly.
- **API client**: `src/lib/api.ts` attaches the JWT, and on `401` clears the session and redirects to `/login` (with a "session expired" message).
- **Auth**: JWT + user stored in `localStorage` (`src/lib/auth.ts`); `RequireAuth` guards the app group; `RouteGuard` + `permissions.ts` enforce menu/route RBAC on the client.
- **Theming**: `next-themes` (class strategy) + semantic CSS-variable tokens; `data-theme`/`.dark` flips them.

## Backend (`devpulse-backend`)

- **Express + TypeScript**, layered as `routes → middleware (authenticate/authorize/validate) → controllers → Prisma`.
- **Auth**: `authenticate` verifies the Bearer JWT and loads the current role from the DB (`roleRef.code`) so role changes take effect immediately. `authorize(...roles)` / `isManagerOrAdmin` / `isAdmin` gate routes.
- **Validation**: Zod schemas per module via a `validate` middleware.
- **Errors**: a central error handler maps `AppError`/Zod/Prisma errors to safe JSON; unknown errors log server-side and return a generic 500 (no stack leak).
- **Security**: `helmet`, CORS from `CORS_ORIGIN`, `express-rate-limit` on `/api/auth/*`, 1 MB JSON body limit, bcrypt password hashing, `trust proxy` for correct client IPs.

## Database (Prisma / PostgreSQL)

Core models: `User`, `Role`, `Project`, `DailyReport`, `Task` (+ `TaskLink`, `TaskAttachment`, `TaskComment`, `TaskAssignee`), `LeaveRequest`, `CalendarEvent`, `LeaveTypePolicy`, `TeamSetting`, `ActivityLog`, `Notification`.

- **Roles** are dynamic (`Role` table via `User.roleId`); a legacy `UserRole` enum is retained for old rows.
- **Multiple assignees**: `TaskAssignee` join table; `Task.assigneeId` kept as a back-compat "primary".
- **Soft delete/archive**: `TaskComment.isDeleted`, `Project.isArchived`.
- **Migrations** are additive and applied on deploy via `start:migrate` (`prisma migrate deploy && node dist/index.js`).

## Auth & RBAC

- **Roles**: `ADMIN`, `MANAGER`, `DEVELOPER`, `QA`, `DESIGNER` (dynamic; more can be added).
- **Enforced on both tiers**: the frontend hides menus/buttons and guards routes; the backend independently enforces `authenticate` + `authorize` and ownership checks. The client is never the source of truth.
- See [SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md) for the endpoint matrix.

## Deployment

- **Frontend → Vercel** (team scope), env `NEXT_PUBLIC_API_URL`. Push to `main` → build → deploy.
- **Backend → Railway**, service Root Directory = repo root, start command `npm run start:migrate` (runs pending migrations then boots). Env: `DATABASE_URL` (internal), `JWT_SECRET`, `CORS_ORIGIN`, `NODE_ENV=production`.
- **Prod migrations / seeds** can also run via the Postgres public proxy: `DATABASE_URL="$PUBLIC_URL" npx prisma migrate deploy`.

## Google Sheet import

Production data was imported from a Google Sheet via `prisma/import-google-daily-meet.ts` (idempotent; `--replace-demo` cleans old demo data). Imported users default to `password123`. Re-import does not overwrite existing choices unless a replace flag is passed.
