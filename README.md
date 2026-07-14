# Mills

Nine Men's Morris — play online, locally, or against a bot.

## Stack

- `apps/web` — Next.js (App Router) UI
- `apps/server` — Express + Socket.IO (authoritative multiplayer)
- `packages/game` — shared rules engine + AI

Games are in-memory on the server; restarting the server clears rooms.

## Setup

Requires Node 20+ and [pnpm](https://pnpm.io/).

```bash
pnpm install
```

## Develop

Terminal 1 — game server (`:4000`):

```bash
pnpm --filter @mills/server dev
```

Terminal 2 — web app (`:3000`):

```bash
pnpm --filter @mills/web dev
```

Or both in parallel:

```bash
pnpm dev
```

Set `NEXT_PUBLIC_SOCKET_URL` in `apps/web/.env.local` (defaults to `http://localhost:4000`).

## Test

```bash
pnpm --filter @mills/game test
```

## Modes

- **Create room / Join / Quick match** — online PvP
- **Online vs bot** — Socket.IO room with server-side AI
- **Local 2-player** — same device, engine in the browser
- **vs AI** — browser-side minimax
