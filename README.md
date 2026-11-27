# VoidLink

A real-time chat and calling platform with a dark, mythic-cosmic visual identity.

> **Status:** Phase 3 — Auth + messaging core complete. Real-time text, presence,
> typing and delivery receipts are live. Next: media (Phase 4).

## Quickstart

```bash
npm install

# 1. PostgreSQL (Docker, or the no-root embedded fallback)
docker compose up -d postgres redis minio
# or: npm run db:local -w @voidlink/server   (port 55432)

# 2. Schema, demo data, API
cd apps/server
export DATABASE_URL="postgresql://voidlink:voidlink@localhost:5432/voidlink"
npx prisma migrate deploy
npx tsx prisma/seed.ts
npm run dev            # API + sockets on :4000

# 3. Web (second terminal, repo root)
npm run dev            # http://localhost:3000
```

Demo accounts: `ashka`, `rune`, `sable` — password `voidlink-dev`.
Sign in from two browsers to watch presence, typing and read receipts move live.

Checks: `npm run typecheck` · `npm test -w @voidlink/server` (needs PostgreSQL) ·
`node apps/server/scripts/verify-search.mjs` · `node apps/server/scripts/smoke-realtime.mjs`.

## Auth & socket notes

- Access JWT 15 min (memory only), refresh token 30 days in an httpOnly cookie scoped to
  `/v1/auth`, rotated on every use; reuse revokes the session family.
- `/chat`: `message:send` (ack), `message:delivered`, `message:read`, `typing:start/stop`,
  `conversation:join`.
- `/presence`: `presence:set`, `presence:snapshot`, `presence:update`.
- Offline sends are queued in `localStorage` and replayed on reconnect; the server
  deduplicates by `(conversationId, clientId)`.

Full plan and phase log: [docs/PLAN.md](docs/PLAN.md).

## Repository layout

| Path | Purpose |
| --- | --- |
| `apps/web` | React 18 + Vite + TypeScript client (Tailwind, Framer Motion, Zustand, react-three-fiber) |
| `apps/server` | Node + Express + TypeScript API, Socket.IO gateways, Prisma data layer |
| `packages/shared` | Zod schemas, shared types, socket event contracts |
| `apps/server/prisma` | Canonical database schema and migrations |
| `infra` | Docker Compose, coturn, MinIO bootstrap, deployment notes |
| `docs` | Plan, design system reference, runbooks |

## Start here

- [docs/PLAN.md](docs/PLAN.md) — moodboard, folder structure, API/socket surface, tokens, roadmap
- [apps/server/prisma/schema.prisma](apps/server/prisma/schema.prisma) — full data model
- [docs/DESIGN-TOKENS.md](docs/DESIGN-TOKENS.md) — palette, type scale, motion, elevation

## Local prerequisites (for later phases)

Node 20+, pnpm 9+, Docker Desktop, FFmpeg (server media worker).
