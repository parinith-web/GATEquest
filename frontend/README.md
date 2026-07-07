# GATEquest frontend

React + Vite SPA. Deploy target: Vercel. The Go auth backend (`/backend`
in this repo) is deployed separately (Render/Fly/VPS) — this project only
talks to it over HTTP, it doesn't run it.

## Local development

```bash
pnpm install
pnpm dev
```

Runs on `http://localhost:8080` and proxies `/api/*` to a Go backend
running locally on `http://localhost:8081` (see `../backend/README.md`).
Run both at once (two terminals).

## Deploying to Vercel

1. Import this `frontend/` directory as the project root in Vercel (if
   your repo has both `frontend/` and `backend/` at the top level, set
   **Root Directory** to `frontend` in the Vercel project settings).
2. Framework preset: Vite (auto-detected). Build command `pnpm build` /
   `vite build`, output directory `dist` — both already the defaults once
   Root Directory is set correctly.
3. Add one environment variable in the Vercel project settings:

   | Variable | Value |
   |---|---|
   | `VITE_API_BASE_URL` | The full URL of your deployed Go backend, e.g. `https://api.yourdomain.com` (no trailing slash, no `/api` suffix) |

4. Deploy. `vercel.json` already handles SPA routing (so refreshing on
   `/quests` etc. doesn't 404).

## After deploying

Your Go backend's `.env` needs to know about this Vercel deployment too —
update `FRONTEND_URL` and `RP_ORIGINS` there to your real Vercel URL (or
custom domain), and `RP_ID` to the bare domain. See `../backend/README.md`.
