# VoidLink

A real-time chat and calling platform with a dark, mythic-cosmic visual identity.

> **Status:** Phase 4 — Media complete. Presigned uploads, image processing,
> thumbnails/blurhash, lightbox, voice notes and view-once Dust Dissolve are live.
> Next: calls (Phase 5).

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
`node apps/server/scripts/verify-search.mjs` · `node apps/server/scripts/smoke-realtime.mjs` ·
`npm run media:verify -w @voidlink/server` (self-contained: spins up S3 + FFmpeg).

## Auth & socket notes

- Access JWT 15 min (memory only), refresh token 30 days in an httpOnly cookie scoped to
  `/v1/auth`, rotated on every use; reuse revokes the session family.
- `/chat`: `message:send` (ack), `message:delivered`, `message:read`, `typing:start/stop`,
  `conversation:join`.
- `/presence`: `presence:set`, `presence:snapshot`, `presence:update`.
- Offline sends are queued in `localStorage` and replayed on reconnect; the server
  deduplicates by `(conversationId, clientId)`.

## Media (Phase 4)

- **Direct-to-storage uploads:** `POST /v1/uploads/presign` creates an upload row and
  returns a presigned PUT, the client uploads the bytes, then
  `POST /v1/uploads/:id/complete` verifies the object and processes it. Limits: images
  15 MB, video 100 MB, audio/voice 25 MB, files 25 MB, 10 attachments per message.
- **Image pipeline:** the browser re-encodes through a canvas (strips EXIF/GPS, applies
  orientation, caps the long edge at 2048); the server re-encodes again with sharp,
  caps at 2048, writes a ≤480px thumbnail, and computes a blurhash placeholder.
- **Video/audio:** ffprobe reads duration/dimensions and ffmpeg extracts a video frame
  for the thumbnail; voice notes store the client's waveform peaks.
- **Private delivery:** media streams through `/v1/media/:id` with a short-lived HMAC
  token, and Range requests are forwarded. View-once media has no URL in the DTO; the
  first `POST /v1/attachments/:id/view` burns it atomically (`410` afterwards).
- **Client:** attachment tray with progress, drag/drop and paste, lightbox with zoom and
  download, waveform voice player with speed control, view-once shroud and the gold/violet
  Dust Dissolve on burn (fade under reduced motion).
- **Local dev:** the API can host an in-process S3 API so no MinIO/Docker is needed:

  ```bash
  cd apps/server
  S3_EMBEDDED=true S3_ENDPOINT=http://127.0.0.1:4568 \
  S3_PUBLIC_ENDPOINT=http://localhost:3000/s3 \
  S3_ACCESS_KEY_ID=S3RVER S3_SECRET_ACCESS_KEY=S3RVER \
  npm run dev
  ```

  Vite proxies `/s3` to the embedded store. For MinIO/R2 set `S3_ENDPOINT` to the
  storage API, `S3_PUBLIC_ENDPOINT` to the endpoint a browser can reach (R2 works), and
  allow `PUT` with `content-type` from `WEB_ORIGIN` in the bucket CORS policy.
- **Not implemented yet:** a virus scanner (successful processing records `CLEAN`; the
  `VIRUS_SCAN_CMD` hook is reserved) and MP4/AAC transcoding for older Safari clients
  (`transcodeKey` is reserved).

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

Node 20+, npm 10+, Docker Desktop (optional: embedded PostgreSQL/S3 fallbacks exist),
FFmpeg + FFprobe on the server for video thumbnails and audio duration.
