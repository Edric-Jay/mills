# Mills

Nine Men's Morris — play online, locally, or against a bot.

## Stack

- `frontend` — Next.js (App Router) UI
- `backend` — Express + Socket.IO (authoritative multiplayer)
- `shared` — shared rules engine + AI (`@mills/game`)

Games are in-memory on the server; restarting the server clears rooms.

Uses **npm workspaces** (Node 20+).

## Setup

```bash
npm install
npm run build -w @mills/game
```

## Develop

Terminal 1 — game server (`:4000`):

```bash
npm run dev:server
```

Terminal 2 — web app (`:3000`):

```bash
npm run dev:web
```

Or both in parallel:

```bash
npm run dev
```

Set `NEXT_PUBLIC_SOCKET_URL` in `frontend/.env.local` (defaults to `http://localhost:4000`).

## Test

```bash
npm test
```

## Modes

- **Create room / Join / Quick match** — online PvP
- **Online vs bot** — Socket.IO room with server-side AI
- **Local 2-player** — same device, engine in the browser
- **vs AI** — browser-side minimax

## How to play

See [HOW_TO_PLAY.md](./HOW_TO_PLAY.md). In the app, use **How to play** on the home page or **?** during a match.

## Deploy

See [DEPLOY.md](./DEPLOY.md) for Vercel (frontend) and Render (backend).
