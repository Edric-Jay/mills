# Deploy Mills

Frontend (Next.js) on **Vercel**, backend (Express + Socket.IO) on **Render**.

Online modes need both. Local 2-player and browser AI work with the frontend alone.

## Shared package (`shared` / `@mills/game`)

`shared` is **not** a separate hosted service. It is the rules engine + AI library used by both apps via npm workspaces.

| Consumer | How it uses `shared` |
| --- | --- |
| **Backend** | Imports compiled JS from `shared/dist` at runtime |
| **Frontend** | Bundles `@mills/game` into the Next.js build |

You must **build `shared` before** building either app. The root scripts already do that:

```bash
# builds shared, then backend
npm run build:server

# builds shared, then frontend
npm run build:web

# or explicitly
npm run build -w @mills/game
```

On deploy platforms, install from the **repo root** so the `shared` workspace is linked, then run a build that includes `@mills/game`.

### What gets produced

```text
shared/
  src/          ← TypeScript source
  dist/         ← emitted by `npm run build -w @mills/game` (needed by backend)
```

`shared/dist` is gitignored; CI / Render / Vercel create it during the build step.

---

## 1. Backend on Render

1. Push this repo to GitHub.
2. In [Render](https://render.com) → **New** → **Web Service** → connect the repo.
3. Settings:

| Setting | Value |
| --- | --- |
| **Runtime** | Node |
| **Root Directory** | *(leave blank — repo root)* |
| **Build Command** | `npm install && npm run build:server` |
| **Start Command** | `npm run start:server` |

`npm run build:server` runs:

1. `npm run build -w @mills/game` → compiles `shared` → `shared/dist`
2. `npm run build -w @mills/server` → compiles `backend` → `backend/dist`

4. Environment variables:

| Name | Value |
| --- | --- |
| `CLIENT_ORIGIN` | Your Vercel URL, e.g. `https://your-app.vercel.app` |
| `PORT` | *(optional — Render sets this)* |

5. Deploy. Note the public URL, e.g. `https://mills-server.onrender.com`.
6. Check health: `https://your-server.onrender.com/health` → `{ "ok": true }`.

### Notes

- Rooms are **in memory**. Redeploys or free-tier sleep wipe active games.
- Free Render services spin down when idle; the first request after wake can be slow.
- If the backend fails with module errors for `@mills/game`, confirm the build command includes the shared package build (use `build:server`, not only `tsc` in `backend`).

---

## 2. Frontend on Vercel

1. In [Vercel](https://vercel.com) → **Add New Project** → import the same repo.
2. Settings:

| Setting | Value |
| --- | --- |
| **Framework Preset** | Next.js |
| **Root Directory** | `frontend` |
| **Install Command** | `cd .. && npm install` |
| **Build Command** | `cd .. && npm run build:web` |
| **Output Directory** | *(leave default)* |

`npm run build:web` runs:

1. `npm run build -w @mills/game` → compiles `shared`
2. `npm run build -w @mills/web` → Next.js production build (pulls in `@mills/game`)

Install from the repo root so workspaces resolve `@mills/game` → `shared/`.

Equivalent explicit build command:

```bash
cd .. && npm run build -w @mills/game && npm run build -w @mills/web
```

3. Environment variable (Production / Preview):

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_SOCKET_URL` | Your Render URL, e.g. `https://mills-server.onrender.com` |

`NEXT_PUBLIC_*` is baked in at **build** time — redeploy the frontend after changing it.

4. Deploy.

---

## 3. Wire CORS

After you know the Vercel URL, set `CLIENT_ORIGIN` on Render to that exact origin (including `https://`, no trailing slash), then redeploy the backend.

If you use a custom domain on Vercel, use that domain as `CLIENT_ORIGIN`.

---

## Checklist

- [ ] `shared` builds successfully as part of both deploy pipelines
- [ ] Backend health endpoint returns `{ "ok": true }`
- [ ] `CLIENT_ORIGIN` matches the live frontend origin
- [ ] `NEXT_PUBLIC_SOCKET_URL` points at the Render service
- [ ] Create room / join works from the deployed site
- [ ] Local / vs AI modes work on the frontend alone (they use `shared` in the browser)

---

## Local env reminder

```bash
# frontend/.env.local
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

Backend defaults: `PORT=4000`, `CLIENT_ORIGIN=http://localhost:3000`.

Before local dev or after pulling changes to `shared`:

```bash
npm install
npm run build -w @mills/game
```
