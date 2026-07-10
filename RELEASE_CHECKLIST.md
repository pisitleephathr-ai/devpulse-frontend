# Release Checklist

## Before merge
- [ ] `npm run lint` and `npm run build` pass (frontend)
- [ ] `npm run typecheck` and `npm run build` pass (backend)
- [ ] `npm test` (backend smoke tests) green
- [ ] No new mock/demo data introduced; no secrets committed
- [ ] Prisma schema change? migration is **additive** and safe (no destructive `DROP`, no data loss); backfill included if needed
- [ ] RBAC unchanged or intentionally updated (frontend + backend both enforce)

## Before deploy
- [ ] `CORS_ORIGIN` in prod is the Vercel domain(s), not `*`
- [ ] Required env vars set on Railway (`DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `NODE_ENV=production`) and Vercel (`NEXT_PUBLIC_API_URL`)
- [ ] Railway service **Root Directory is empty** (repo root) — a wrong value fails the build at "scheduling"
- [ ] DB backup taken if the migration touches existing tables

## Deploy
- [ ] Push to `main` → Vercel + Railway auto-deploy
- [ ] Railway `start:migrate` applies pending migrations on boot (watch build logs)
- [ ] If a migration is stuck: check Railway build logs; `npx prisma migrate status` against the public proxy; `prisma migrate resolve` if a migration is half-applied

## After deploy — verify
- [ ] `/api/health` → 200
- [ ] Login as `boss@devpulse.io` works; dashboard shows real data
- [ ] New endpoints/routes respond (not 404); migrations applied (`migrate status` = up to date)
- [ ] Spot-check the changed feature in the browser (light + dark, desktop + mobile)
- [ ] No console errors; 401 redirects to login; 403 on restricted routes

## Rollback
- Frontend: redeploy the previous Vercel deployment (instant), or `git revert` + push.
- Backend: redeploy the previous Railway deployment. **Additive migrations are backward-compatible**, so the previous image runs against the new schema; only `git revert` + redeploy if code must roll back.
- Never run `prisma migrate reset` or `db push` against production.
