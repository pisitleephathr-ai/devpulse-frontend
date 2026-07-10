# Deploying the DevPulse Frontend to Vercel

The frontend talks to the backend through a single env var,
`NEXT_PUBLIC_API_URL`. No other configuration is required.

## 1. Import the project

1. Push this repo to GitHub (already done: `pisitleephathr-ai/devpulse-frontend`).
2. In Vercel: **Add New → Project → import `devpulse-frontend`**.
   Framework preset **Next.js** is detected automatically.

## 2. Environment variable

In **Project → Settings → Environment Variables** add:

| Name | Value | Environments |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `https://<your-backend>.up.railway.app` | Production, Preview, Development |

(No trailing slash.) Redeploy after changing it — `NEXT_PUBLIC_*` vars are
inlined at build time.

## 3. Deploy

Vercel runs `next build` and serves the app. Then, on the backend, set
`CORS_ORIGIN` to the resulting Vercel URL so the browser can call the API.

## 4. Verify

1. Open `https://<your-app>.vercel.app` → redirects to `/login`.
2. Log in with `lena@devpulse.io` / `password123`.
3. You should land on the dashboard with live data from the API.

## Local development

```bash
cp .env.example .env.local          # NEXT_PUBLIC_API_URL=http://localhost:4000
npm install
npm run dev                          # http://localhost:3000
```

Run the backend (`npm run dev` in `devpulse-backend`, with Postgres up) first.

## How the integration works

- `src/lib/config.ts` — reads `NEXT_PUBLIC_API_URL`.
- `src/lib/api.ts` — fetch client; attaches `Authorization: Bearer <jwt>`,
  redirects to `/login` on 401.
- `src/lib/auth.ts` — JWT + user stored in `localStorage`.
- `src/lib/mappers.ts` — enum ↔ Thai/English labels, ISO ↔ "d ม." dates,
  API entities → the existing view types.
- `src/lib/store.tsx` — API-backed data store; same interface the pages already
  used, so the UI is unchanged.
