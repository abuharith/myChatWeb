# VoidLink — Phase 1: Plan

**Version:** 0.1 · **Status:** awaiting confirmation before Phase 2

---

## 1. Moodboard (in words)

**Feeling.** Standing inside a dead titan's ribcage, adrift in a nebula. The room is
obsidian — not flat black, but a stone that drinks light — and everything structural is
edged in a single hairline of old gold, like inlaid funerary script. Light does not
flood the space; it *leaks* from six gem sockets and from the slow drift of purple gas
outside the walls.

**Palette impression.** Near-black violet base. Purple is the *energy* (calls, focus,
primary action). Gold is the *civilisation* (borders, active states, titles, the crest).
The six gems are the only saturated full-chroma colours in the product — they read as
jewellery set into armour, never as status badges.

**Texture.** Three layers stacked on every panel: (1) a 3% opacity film grain,
(2) 1px gold hairlines at 12–22% alpha with a soft inner highlight on the top edge,
(3) a faint radial bloom behind the active element. Surfaces are chamfered, not rounded:
corners are cut at 8–14px with an angled armour-plate silhouette (`clip-path`), and
bubbles carry a 1px gold chamfer along the sending edge only.

**Motion language.** Heavy, slow, inevitable — the movement of something massive
waking up, not a bouncy consumer app.
- Inertia-first easing: `cubic-bezier(0.16, 1, 0.3, 1)` for entrances, `cubic-bezier(0.7, 0, 0.84, 0)` for exits.
- Nothing scales above 1.06. Nothing bounces. Nothing spins faster than 40s per revolution.
- Light travels along edges (gold sweep), never across whole panels.
- Destruction is beautiful: Dust Dissolve turns removal into drifting embers.
- Every effect has a still, reduced-motion equivalent that keeps the state change legible.

**Sound.** A cathedral low end: 40–90 Hz thud on send, a struck crystal at 2.4 kHz for
receive, a rising harmonic swell for calls. Master bus at −18 LUFS. Off by default.

**Signature.** A six-gem ring dock, each gem in a gold socket; a colossal armoured
silhouette barely visible behind the chat; a violet-gold pointer glow that follows the
cursor across panels.

**Anti-goals.** No flat #121212 "dark mode", no rounded-3xl chat bubbles, no WhatsApp /
Discord / Telegram geometry, no third-party character, logo or trademarked silhouette.
The logo is original: a six-facet gem ring beneath a three-prong gold crest.

---

## 2. Design tokens (summary)

Full reference: [DESIGN-TOKENS.md](DESIGN-TOKENS.md). Everything ships as CSS custom
properties on `:root` and is mirrored into Tailwind theme tokens, so the Phase 7
"theme intensity" and "reduced motion" settings can retune the product at runtime.

```css
:root {
  /* Void scale */
  --void-black:#05030A; --abyss:#0D0715; --obsidian:#141020; --basalt:#1C1729;
  /* Titan purple */
  --titan-purple-900:#2A0F45; --titan-purple-700:#4B1D7A; --titan-purple-500:#7B2FBE;
  --titan-purple-300:#A768E8;
  /* Armour gold */
  --titan-gold-700:#8A6E14; --titan-gold-500:#C9A227; --titan-gold-300:#F2D472;
  /* Semantic */
  --ember:#FF5A1F; --ash:#8C8599; --bone:#EDE7F6;
  /* Six power gems */
  --gem-violet:#9B5CFF; --gem-azure:#3FA9FF; --gem-emerald:#2FD39B;
  --gem-amber:#FFB63D; --gem-crimson:#FF4D6D; --gem-cyan:#3FE0E0;
  /* Structure */
  --hairline:rgba(201,162,39,.18); --glass:rgba(20,16,32,.62);
  --blur-panel:18px; --noise-opacity:.035;
  /* Motion */
  --ease-inertia:cubic-bezier(.16,1,.3,1); --ease-collapse:cubic-bezier(.7,0,.84,0);
  --dur-fast:140ms; --dur-base:260ms; --dur-slow:520ms; --dur-dissolve:1200ms;
}
```

Low-power mode sets `--noise-opacity:0`, `--blur-panel:0px`, halves particle counts and
freezes the nebula shader. `prefers-reduced-motion` removes parallax, portals and the
dust dissolve (replaced by a 180ms opacity fade).

---

## 3. Folder structure

```
voidlink/
├─ package.json                     # pnpm workspace root, turbo-free scripts
├─ pnpm-workspace.yaml
├─ tsconfig.base.json               # strict:true, noUncheckedIndexedAccess
├─ .env.example
├─ .editorconfig  .prettierrc  eslint.config.js
├─ docker-compose.yml               # web, server, postgres, redis, minio, coturn
├─ docs/
│  ├─ PLAN.md                       # this file
│  ├─ DESIGN-TOKENS.md
│  ├─ API.md                        # REST + socket contract (phase 3 fills bodies)
│  └─ DEPLOYMENT.md                 # phase 7
├─ infra/
│  ├─ coturn/turnserver.conf
│  ├─ minio/init.sh                 # bucket + CORS bootstrap
│  └─ nginx/voidlink.conf           # TLS termination + websocket upgrade
│
├─ apps/server/
│  ├─ prisma/
│  │  ├─ schema.prisma              # canonical data model (this phase)
│  │  ├─ migrations/
│  │  └─ seed.ts                    # 3 demo users, 1 group, 1 call log
│  ├─ src/
│  │  ├─ index.ts                   # bootstrap: http + socket + workers
│  │  ├─ app.ts                     # express app, middleware chain
│  │  ├─ config/                    # env parsing (zod), constants
│  │  ├─ lib/                       # prisma, redis, s3, jwt, argon2, logger, errors
│  │  ├─ http/
│  │  │  ├─ routes/                 # auth, users, contacts, conversations, messages,
│  │  │  │                          # uploads, calls, stories, reports, admin, push
│  │  │  ├─ controllers/            # thin: parse → service → serialize
│  │  │  ├─ middleware/             # authGuard, validate(zod), rateLimit, csrf,
│  │  │  │                          # errorHandler, requestId, cors
│  │  │  └─ serializers/            # DTO mappers (never leak passwordHash)
│  │  ├─ services/                  # auth, presence, conversation, message, media,
│  │  │                             # call, story, notification, moderation, search
│  │  ├─ repositories/              # prisma queries only, no business rules
│  │  ├─ sockets/
│  │  │  ├─ index.ts                # io + redis adapter + auth handshake
│  │  │  ├─ chat.gateway.ts         # /chat namespace
│  │  │  ├─ presence.gateway.ts     # /presence namespace
│  │  │  ├─ signaling.gateway.ts    # /signaling namespace (WebRTC + LiveKit tokens)
│  │  │  └─ guards.ts               # per-event zod validation, membership checks
│  │  ├─ workers/                   # media.processor (ffmpeg, blurhash, virus scan),
│  │  │                             # story.expiry, message.expiry, push.sender
│  │  └─ tests/                     # vitest unit + supertest integration
│  └─ tsconfig.json
│
├─ apps/web/
│  ├─ index.html  vite.config.ts  tailwind.config.ts  postcss.config.js
│  ├─ public/                       # icons, manifest, logo.svg, sound pack (wav/mp3)
│  ├─ e2e/                          # playwright: send message, upload image, place call
│  └─ src/
│     ├─ main.tsx  App.tsx  router.tsx
│     ├─ styles/                    # tokens.css, base.css, utilities.css, grain.svg
│     ├─ lib/                       # api client, socket client, webrtc peer, recorder,
│     │                             # image compress, e2ee (libsodium), sound bus, offline queue
│     ├─ store/                     # zustand: auth, conversations, messages, calls, ui
│     ├─ hooks/                     # useMessages, useInfiniteMessages, useCall, usePresence…
│     ├─ components/
│     │  ├─ ui/                     # Button, Input, Avatar, Bubble, GemIcon, Panel,
│     │  │                          # Modal, Sheet, Toast, Tooltip, Switch, Skeleton
│     │  ├─ layout/                 # AppShell, Sidebar, GemDock, InfoPanel, MobileNav
│     │  ├─ chat/                   # MessageList, MessageItem, Composer, TypingEmbers,
│     │  │                          # ReplyBar, EmojiPicker, LinkPreviewCard, PinnedTray
│     │  ├─ media/                  # AttachmentGrid, Lightbox, VoiceBubble, Waveform,
│     │  │                          # UploadTray, ViewOnceShroud
│     │  ├─ calls/                  # IncomingPortal, CallStage, CallGrid, CallControls,
│     │  │                          # FloatingCall, CallHistoryRow
│     │  ├─ stories/                # StoryRail, StoryViewer, StoryComposer
│     │  ├─ effects/                # NebulaScene (r3f, lazy), StarField, TitanMonolith,
│     │  │                          # CursorAura, DustDissolve, GemIgnite, VoidWipe
│     │  └─ screens/                # Auth, Chats, Calls, Status, Media, Contacts,
│     │                             # Settings, Admin
│     ├─ sw.ts                      # service worker: offline shell + web push
│     └─ tests/                     # vitest + testing-library
│
└─ packages/shared/
   ├─ src/
   │  ├─ index.ts
   │  ├─ enums.ts                   # mirrors Prisma enums (single source in Zod)
   │  ├─ schemas/                   # auth, user, message, conversation, call, story, report
   │  ├─ events.ts                  # typed socket contracts (server↔client both import)
   │  ├─ constants.ts               # limits: 8 call participants, 100 MB video, 25 MB image…
   │  └─ format.ts                  # duration, bytes, last-seen, markdown-lite renderer
   └─ tsconfig.json
```

**Layering rule:** `routes → controllers → services → repositories`. Controllers never
touch Prisma; services never touch `req`/`res`; repositories never contain policy.
Sockets call the same services as REST so unread counts, receipts and last-message
pointers can never diverge.

---

## 4. Database schema

Canonical file: [`apps/server/prisma/schema.prisma`](../apps/server/prisma/schema.prisma).

### 4.1 Entity map

```
User ──1:1── UserSettings
 │ ├──1:N── Device ──1:N── Session
 │ ├──1:1── IdentityKey ──1:N── PreKey
 │ ├──1:N── KeyEnvelope ──1:N── Device        (per-device conversation key wraps, E2EE)
 │ ├──1:N── Contact (owner → contactUser)     unique(owner, contact)
 │ ├──1:N── Block   (blocker → blocked)       unique pair
 │ ├──1:N── Participant ──N:1── Conversation
 │ ├──1:N── Message ──1:N── Attachment, Reaction, MessageReceipt, MessageEdit
 │ ├──1:N── Call (initiator) ──1:N── CallParticipant
 │ ├──1:N── Story ──1:N── StoryView
 │ ├──1:N── Report (filed / received / handled)
 │ └──1:N── PushSubscription, Notification, ModerationAction
Conversation ──1:N── ConversationInvite, LinkPreview? (no: preview cached per URL)
Upload ──1:1── Attachment                (presigned PUT lifecycle → attach on send)
```

### 4.2 Key decisions

- **Message ordering.** `seq BIGSERIAL` global monotonic id *plus* `@@index([conversationId, seq])`.
  Cursor pagination is `WHERE conversationId = ? AND seq < ? ORDER BY seq DESC LIMIT 30`,
  which is stable under concurrent writes and drives infinite scroll in both directions.
- **Idempotency.** `Message.clientId` (client UUID) is unique per conversation, so an
  offline-queue replay or a double socket emit creates exactly one row.
- **Delivery states.** `MessageReceipt` holds `deliveredAt` / `readAt` per recipient.
  Single service writes it; both REST and socket paths reuse it.
- **E2EE.** `IdentityKey` (X25519 + Ed25519 signed prekey) per user, `PreKey` one-time
  pool, and `KeyEnvelope` wrapping the conversation key per *device*. Server never sees
  plaintext conversation keys. `Message.encrypted` marks payloads stored as ciphertext.
- **"For me" vs "for everyone".** `Message.deletedForEveryone` + `deletedAt` scope the
  tombstone; per-user hides live in `MessageHide` (user, message) so a delete-for-me
  never affects other participants.
- **Disappearing messages.** `Conversation.disappearingSeconds` and `Message.expiresAt`;
  expiry worker hard-deletes attachments from the bucket.
- **Full-text search.** `Message.searchVector tsvector` (GENERATED column, migration SQL)
  with a GIN index, plus `pg_trgm` on `User.username`/`displayName` for contact search.
  Prisma marks it `Unsupported("tsvector")` and all writes go through raw SQL in the
  repository.
- **Calls.** `Call` is the room, `CallParticipant` is per-user state and duration.
  `sfuRoom` stores the LiveKit room for group calls; 1-to-1 stays P2P and leaves it null.
- **Retention.** `Upload` rows expire after 24h if never attached; orphans swept hourly.
- **Soft delete everywhere user-visible** (`deletedAt`), hard delete only via account
  deletion and the expiry worker.

---

## 5. API surface (REST)

All responses are `{ data }` or `{ error: { code, message, details? } }`. Auth is
`Authorization: Bearer <access>` with a rotating httpOnly refresh cookie.

```
POST   /v1/auth/register            POST /v1/auth/login        POST /v1/auth/refresh
POST   /v1/auth/logout              POST /v1/auth/verify-email POST /v1/auth/resend-verify
POST   /v1/auth/password/forgot     POST /v1/auth/password/reset
GET    /v1/auth/google              GET  /v1/auth/google/callback

GET    /v1/users/me                 PATCH /v1/users/me
GET    /v1/users/me/settings        PATCH /v1/users/me/settings
GET    /v1/users/me/sessions        DELETE /v1/users/me/sessions/:id
GET    /v1/users/:username          GET  /v1/users/search?q=
POST   /v1/users/me/keys            GET  /v1/users/:id/keys/bundle     (E2EE prekey bundle)

GET    /v1/contacts                 POST /v1/contacts          DELETE /v1/contacts/:id
POST   /v1/contacts/block           DELETE /v1/contacts/block/:userId
GET    /v1/contacts/qr              POST /v1/contacts/qr/resolve

GET    /v1/conversations            POST /v1/conversations
GET    /v1/conversations/:id        PATCH /v1/conversations/:id       DELETE /v1/conversations/:id
POST   /v1/conversations/:id/members          DELETE /v1/conversations/:id/members/:userId
PATCH  /v1/conversations/:id/members/:userId  POST /v1/conversations/:id/leave
POST   /v1/conversations/:id/invites          DELETE /v1/conversations/invites/:code
GET    /v1/conversations/invites/:code
POST   /v1/conversations/:id/read             POST /v1/conversations/:id/pin
POST   /v1/conversations/:id/mute

GET    /v1/conversations/:id/messages?before=&after=&limit=
POST   /v1/conversations/:id/messages
PATCH  /v1/messages/:id                       (edit)
DELETE /v1/messages/:id?scope=me|everyone
POST   /v1/messages/:id/reactions             DELETE /v1/messages/:id/reactions/:emoji
POST   /v1/messages/:id/forward               POST /v1/messages/:id/pin
GET    /v1/conversations/:id/pinned           GET /v1/messages/search?q=&conversationId=
POST   /v1/messages/:id/view                  (view-once: burn + returns media URL once)

POST   /v1/uploads/presign                    POST /v1/uploads/:id/complete
DELETE /v1/uploads/:id
GET    /v1/conversations/:id/media?kind=image|video|voice|file

GET    /v1/calls                              POST /v1/calls
GET    /v1/calls/:id                          POST /v1/calls/:id/token      (LiveKit, group)
POST   /v1/calls/:id/end                      POST /v1/calls/:id/participants/leave

GET    /v1/stories/feed                       POST /v1/stories
POST   /v1/stories/:id/view                   DELETE /v1/stories/:id
GET    /v1/stories/:id/viewers

POST   /v1/reports                            GET /v1/admin/reports
PATCH  /v1/admin/reports/:id                  POST /v1/admin/users/:id/ban
POST   /v1/admin/users/:id/unban              GET  /v1/admin/stats
GET    /v1/admin/audit

POST   /v1/push/subscribe                     DELETE /v1/push/subscribe
POST   /v1/push/test
GET    /v1/health  /v1/health/ready
```

**Limits:** auth 10/min/IP · message send 30/min/user · upload presign 20/min/user ·
call create 6/min/user · global 300/min/user (Redis token bucket, `Retry-After` set).

---

## 6. Socket.IO surface

Handshake: `auth: { token }` → verified once, `socket.data.userId` set. Every event
payload is parsed by a Zod schema from `packages/shared`; failures emit `error` and are
rate-limited per socket (token bucket in Redis).

### `/chat`
| Direction | Event | Payload |
| --- | --- | --- |
| C→S | `conversation:join` / `conversation:leave` | `{ conversationId }` |
| C→S | `message:send` | `{ conversationId, clientId, type, body, replyToId?, attachments[], encrypted? }` |
| S→C | `message:new` | full `MessageDTO` + `tempId` echo |
| S→C | `message:ack` | `{ clientId, messageId, seq, sentAt }` |
| C→S | `message:edit` / `message:delete` | `{ messageId, body? , scope? }` |
| S→C | `message:updated` / `message:deleted` | `{ messageId, scope, patch? }` |
| C→S | `message:delivered` / `message:read` | `{ conversationId, messageIds[] }` |
| S→C | `receipt:update` | `{ conversationId, userId, messageId, state, at }` |
| C→S | `typing:start` / `typing:stop` | `{ conversationId }` |
| S→C | `typing` | `{ conversationId, userId, until }` |
| C→S | `reaction:toggle` | `{ messageId, emoji }` |
| S→C | `reaction:updated` | `{ messageId, reactions[] }` |
| C→S | `message:pin` | `{ messageId, pinned }` |
| S→C | `conversation:updated` | `{ conversationId, patch }` |
| S→C | `conversation:created` | `ConversationDTO` |
| S→C | `member:joined` / `member:left` / `member:role` | membership deltas |
| S→C | `story:new` / `story:expired` | `StoryDTO` |

### `/presence`
| Direction | Event | Payload |
| --- | --- | --- |
| C→S | `presence:set` | `{ status: ONLINE\|AWAY\|DND\|OFFLINE, manual?: boolean }` |
| S→C | `presence:update` | `{ userId, status, lastSeenAt }` |
| S→C | `presence:snapshot` | `{ entries[] }` for the caller's contact graph |
| S→C | `presence:typing` | multiplexed typing (mirrors `/chat`) |

Presence is Redis-backed with a 60s heartbeat TTL and a debounced Postgres
`lastSeenAt` write (max 1 write/user/30s).

### `/signaling`
| Direction | Event | Payload |
| --- | --- | --- |
| C→S | `call:invite` | `{ conversationId, kind: audio\|video, calleeIds[] }` |
| S→C | `call:incoming` | `{ callId, from, kind, conversationId, expiresAt }` |
| C→S | `call:accept` / `call:decline` / `call:end` / `call:busy` | `{ callId }` |
| C→S | `rtc:offer` / `rtc:answer` / `rtc:ice` | `{ callId, toUserId, sdp?/candidate }` |
| S→C | `rtc:signal` | `{ callId, fromUserId, kind, sdp?/candidate }` |
| C→S | `call:media` | `{ callId, muted?, cameraOn?, screenSharing? }` |
| S→C | `call:participant` | `{ callId, participant, state }` |
| S→C | `call:quality` | `{ callId, userId, rtt, loss, level }` |
| C→S | `call:hand` | `{ callId, raised }` |
| S→C | `call:ended` | `{ callId, reason, durationSeconds }` |
| C→S | `call:reaction` | `{ callId, emoji }` |
| C→S | `call:reconnect` | `{ callId }` → resumes ICE/state |

**Scaling:** `@socket.io/redis-adapter` with a dedicated pub/sub pair; all rooms are
`conv:{id}` / `call:{id}` so any node can broadcast. WebRTC ICE uses coturn
(`TURNS 5349`, short-lived HMAC credentials issued by `GET /v1/calls/:id`); group calls
use LiveKit with per-participant JWTs scoped to one room, max 8 publishers.

---

## 7. Roadmap & per-phase test checklists

| Phase | Deliverable | "How to test" |
| --- | --- | --- |
| **1 Plan** ✅ | moodboard, structure, schema, tokens, API/socket contract | `npm run prisma:validate`; review docs; confirm schema covers every Phase 3–6 feature |
| **2 Design system** ✅ | Tailwind config, tokens.css, UI primitives, NebulaScene + fallbacks, GemDock, `/` gallery | `npm run dev` → gallery; toggle reduced motion + low power in the masthead |
| 3 Auth & messaging | register/login/refresh, sockets, send/receive, receipts, typing, presence | two browsers, two accounts: message appears <150ms, states advance sending→read, refresh keeps session, offline queue replays |
| 4 Media | presigned uploads, thumbs, lightbox, voice recorder, Dust Dissolve | drop PNG/MP4/voice clip; check thumbnail + blurhash, swipe/zoom lightbox, view-once burns after open |
| 5 Calls | 1-to-1 WebRTC, group SFU, screen share, PiP, history | two tabs → audio/video connects, mute/camera/screenshare, hang up writes duration; 8-client group room |
| 6 Extras | stories, search, settings, push, admin | story expires in 24h (seeded clock), FTS returns hits, push test fires, admin bans a user |
| 7 Hardening | unit + integration + Playwright, security review, perf, deploy docs | `pnpm test`, `pnpm e2e`, Lighthouse desktop ≥90, `docker compose up` on clean machine |

### Phase 7 exit criteria (agreed up front)
TypeScript strict with zero `any` in app code · all mutating routes validated by Zod ·
no secret in client bundle · uploads MIME-sniffed server-side · CSRF on cookie flows ·
rate limits proven by test · axe pass on chat + call screens · Lighthouse desktop ≥90.

---

## 8. Assumptions to confirm

1. **Group calls use LiveKit** (managed or self-hosted) rather than building an SFU.
   1-to-1 remains pure P2P WebRTC. Alternative: mediasoup if you want no third party.
2. **S3 target defaults to MinIO** locally and Cloudflare R2 in production (presigned
   PUT, no server proxying of bytes).
3. **Email** (verification, reset) uses a pluggable transport — console in dev, Resend/
   SES in production — so no provider is hard-coded this early.
4. **Stories** are visible to the author's accepted contacts by default, with a
   "close circle" flag.
5. **PWA push** is best-effort on iOS (16.4+ installed only); the in-app channel is
   always authoritative.

**Confirmed by the product owner (Phase 2 kickoff):** LiveKit for group calls, P2P
WebRTC for 1-to-1, MinIO locally / Cloudflare R2 in production with presigned uploads.

---

## 9. Phase log

### Phase 2 — Design system (done)

- **Dependencies** installed with npm workspaces (pnpm is not available in the build
  environment); `package-lock.json` is the lockfile of record.
- **Tokens** live in `apps/web/src/styles/tokens.css`; Tailwind mirrors them via
  `var()` references, so `.low-power` / `.reduce-motion` retune the product without a
  rebuild.
- **Primitives** in `apps/web/src/components/ui`: Button, Input, Avatar, Bubble, GemIcon,
  Panel, Modal — plus the fixed `GemDock`.
- **Atmosphere** in `apps/web/src/components/effects`: CSS nebula fallback, lazy
  react-three-fiber shader nebula, 360-point star field, original monolith vector art,
  cursor aura, film grain.
- **Search migration** `20260101000100_search_indexes` adds `pg_trgm`, the STORED
  generated `messages.searchVector` (excluding E2EE payloads), its GIN index, trigram
  indexes on usernames / display names / conversation titles, and the
  `voidlink_message_rank()` helper.
- **Verified:** `tsc --noEmit` clean, `vite build` clean (initial UI chunk 58 kB gzip;
  Three.js stays in a lazy chunk), gallery served from the Vite dev server.

### Phase 3 — Auth & messaging core (done)

- **Search drift fixed and proven.** PostgreSQL 19 applied both migrations; Prisma's
diff went from “DROP the GIN index, DROP the trigram indexes, ALTER COLUMN … DROP DEFAULT”
to **“This is an empty migration.”** The column is now trigger-maintained
(`messages_search_vector_trg`) and the four search indexes are declared in
`schema.prisma` with Prisma-canonical names, so no future migration undoes them.
Verified by `scripts/verify-search.mjs`: insert, edit, E2EE exclusion, rank helper,
all four indexes, `pg_trgm`.
- **Auth:** Argon2id hashing, 15-minute access JWTs, 30-day rotating refresh tokens
stored only as SHA-256 digests in `Session`, reuse detection revoking the session
family, httpOnly SameSite=Lax cookie scoped to `/v1/auth`, helmet/CORS/rate limits,
Zod validation, unified error envelope.
- **Messaging:** REST + `/chat` socket share one service layer. Optimistic sends,
socket ack reconciliation, `(conversationId, clientId)` idempotency, cursor pagination
by `seq`, per-recipient `MessageReceipt` states, delivery/read fan-out, typing
broadcasts, presence snapshots and online/offline transitions with persisted
`lastSeenAt`, block enforcement on direct sends.
- **Realtime:** `/chat` and `/presence` namespaces with handshake auth, private
`user:{id}` rooms and `conv:{id}` rooms; Redis adapter when `REDIS_URL` is set;
token rotation on reconnect; in-process presence/send limits.
- **Client:** login/register with seeded demo accounts, conversation list, new-link
search, chamfered bubbles with delivery ticks, typing embers, unread badges, offline
queue in `localStorage` with replay, mobile single-column layout, themed placeholders
for the four later chambers.
- **Verified:** 7/7 supertest integration tests (register, duplicate conflict, bad
credentials, login, idempotent direct conversation, message send/dedupe/read,
refresh rotation + reuse detection); 7/7 realtime socket checks (auth, presence,
typing, delivery, read receipt, idempotency); `tsc` clean on shared, server and web;
`vite build` clean; login and socket handshake work through the Vite proxy.
- **Local database:** no Docker/root in this environment, so `scripts/dev-db.mjs`
runs a real PostgreSQL 19 via the dev-only `embedded-postgres` package on port 55432.
Docker Compose remains the documented path for normal machines.

#### Phase 3 review — unread badges

A fresh-eyes pass found four ways a badge could drift: the increment ran in a
second `set` after the message was already rendered (a concurrent read or list
refresh could overwrite it), a replayed `message:new` counted again, a list fetch
started before an increment replaced it on completion (and a read racing the same
fetch could resurrect a count), and returning to a hidden tab never flushed the
open conversation. Fixed by extracting pure transitions to
`apps/web/src/lib/unread.ts`:

- increments are idempotent per message id (session-scoped dedupe set, capped);
  own messages and messages being read never increment;
- every local transition is appended to an epoch log; `loadConversations`
  snapshots the epoch before the request, treats the server as authoritative for
  everything before it, and replays later increments/reads on top;
- `markRead` writes 0 and the read event in the same transition as the badge;
- `visibilitychange` marks the open conversation read when the tab returns.

Covered by 11 Vitest cases in `apps/web/src/lib/unread.test.ts` (increment rules,
replay ordering, stale-server handling, 99+ formatting).

### Phase 4 — Media (presigned uploads, voice, view-once)

**Storage contract.** One S3 client serves MinIO, R2 and AWS. Presigning uses a separate
public endpoint (`S3_PUBLIC_ENDPOINT`) so upload URLs are signed for the host the browser
actually calls; everything else stays on the private endpoint. Uploads follow
presign → direct PUT → complete, and `Upload` rows are scoped to the creator. `complete`
heads the object, rejects size mismatches, then processes and writes an `Attachment` with
metadata; messages can only link attachments whose upload is READY, unclaimed and owned by
the sender.

**Processing.** Images are auto-rotated and capped at 2048 with sharp, re-encoded (which
drops EXIF/GPS), given a ≤480px JPEG thumbnail and a blurhash. GIFs pass through with a
first-frame thumbnail. Video is probed with ffprobe and a frame extracted at ~1s with
ffmpeg for the poster/blurhash. Voice duration is taken from the client or ffprobe; the
waveform peaks come from the recorder's AnalyserNode. FFmpeg absence degrades gracefully
(no video poster, no probed duration) instead of failing the upload.

**Delivery and view-once.** Media is private and served by the API through
`/v1/media/:id?variant=full|thumb&token=…`; the token is an HMAC over attachment id,
variant and expiry, and Range headers are forwarded for seeking. View-once attachments
are returned with `url: null`; `POST /v1/attachments/:id/view` marks `openedAt` atomically
(only the first caller wins) and returns a five-minute URL, after which the endpoint
answers `410 ATTACHMENT_VIEWED`.

**Client.** Canvas compression before upload, XHR progress, drag/drop/paste, staged
attachment tray, lightbox with zoom/download, waveform voice notes with seek and speed,
view-once shroud, and Dust Dissolve (120 canvas motes, reduced-motion fade).

**Verified.**
- `npm run media:verify -w @voidlink/server` — 12/12 checks against a real S3 API, real
  sharp and real FFmpeg: presign+PUT+complete, orientation applied, EXIF removed,
  2048 cap, ≤480 thumbnail, blurhash, attachment delivery to the recipient, cross-account
  reuse rejected, voice waveform/duration round-trip, video duration + frame thumbnail,
  view-once URL hidden then burned (410 on reopen), MIME/size/token rejections, upload
  ownership.
- Existing 7/7 supertest API tests, 7/7 realtime smoke, `tsc` clean (shared/server/web),
  `vite build` clean.
- Browser (432px mobile viewport, two isolated sessions where needed): uploaded a JPEG
  through the real presigned URL, sent it, loaded the signed media URL, opened/closed the
  lightbox, played a voice note, sent a view-once photo, opened and closed it (dust canvas
  sampled active, then gone), and confirmed the shroud flips to “opened once”. Media
  responses were 200/206 with no page errors.
- **Limits:** microphone capture could not be exercised in this headless browser (the
  recorder UI/permission path is implemented but untested with hardware; voice playback
  was verified with a real uploaded WAV). Dust Dissolve was verified by DOM presence and
  timings rather than a frame-perfect visual capture.
