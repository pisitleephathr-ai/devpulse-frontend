# DevPulse

A team operations dashboard for software teams — track **daily reports, tasks, leave requests, projects, blockers, and team activity** in one place.

- **Live app:** https://devpulse-fontend.vercel.app
- **Live API:** https://devpulse-backend-production-a216.up.railway.app

## Features

- **Dashboard insights** — KPIs, per-person workload, report-submission status, top blockers, recent activity, dynamic Bangkok-time greeting
- **Daily reports** — card layout, defaults to today, search + author/project/status/date filters, CSV export
- **Task board** — Kanban with drag-drop, **multiple assignees**, comments, links, filters, CSV export
- **File attachments** — drag-drop / click / paste (Ctrl-V) image + document upload to Cloudinary (signed direct upload), per-file progress, cancel/retry, thumbnails + lightbox, per-task limits; legacy URL attachments still supported. See the backend `ATTACHMENTS.md`.
- **Projects** — create / edit / archive / restore, per-project stats
- **Leave requests** — request, approve/reject (RBAC-gated, no self-approval)
- **Calendar** — real tasks (due dates), reports, approved leaves, and events aggregated per month
- **Users & roles** — dynamic roles, `requiresDailyReport` per user
- **Activity / audit log** — filterable (manager/admin only)
- **Global search** — Cmd/Ctrl+K command palette across all entities
- **Notifications** — in-app bell with polling
- **Polish** — dark mode, skeleton loading, subtle animations, responsive (mobile drawer), RBAC throughout

## Tech stack

| Layer | Tech |
| --- | --- |
| Frontend | Next.js (App Router), TypeScript, Tailwind CSS v4, next-themes, framer-motion, lucide-react |
| Backend | Express, TypeScript, Prisma, PostgreSQL, JWT, Zod, bcryptjs, helmet, express-rate-limit |
| Hosting | Vercel (frontend), Railway (backend + Postgres) — GitHub auto-deploy |

## Repositories

- Frontend: `pisitleephathr-ai/devpulse-frontend`
- Backend: `pisitleephathr-ai/devpulse-backend`

## Local setup

### Backend
```bash
cd devpulse-backend
npm install
cp .env.example .env        # set DATABASE_URL, JWT_SECRET, CORS_ORIGIN
npx prisma migrate deploy   # or: npm run migrate  (dev)
npm run seed                # seed demo roles/users (password: password123)
npm run dev                 # http://localhost:4000
```

### Frontend
```bash
cd devpulse-fontend
npm install
# .env.local:  NEXT_PUBLIC_API_URL=http://localhost:4000
npm run dev                 # http://localhost:3000
```

## Environment variables

**Backend** (`.env`)

| Var | Notes |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `JWT_SECRET` | ≥ 16 chars |
| `JWT_EXPIRES_IN` | e.g. `7d` |
| `PORT` | default 4000 |
| `NODE_ENV` | `development` \| `production` \| `test` |
| `CORS_ORIGIN` | comma-separated origins; the Vercel domain in prod (not `*`) |

**Frontend** (`.env.local`): `NEXT_PUBLIC_API_URL` → the API base URL.

## Common scripts

**Backend:** `npm run dev`, `npm run build`, `npm run typecheck`, `npm test` (API smoke tests), `npm run migrate:deploy`, `npm run seed`, `npm run seed:roles`.
**Frontend:** `npm run dev`, `npm run lint`, `npm run build`.

## Demo account

Seeded users log in with **`password123`** (e.g. `boss@devpulse.io`). The login page's "ทดลองใช้งาน" button prefills a demo email; enter the password to sign in. Change default passwords for real use.

## Docs

- [ARCHITECTURE.md](ARCHITECTURE.md) · [TESTING.md](TESTING.md) · [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) · [SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md)
