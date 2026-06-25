# Omnidesk

Self-hosted unified inbox for personal **Telegram** (MTProto) and **WhatsApp**
(WhatsApp Web) accounts, plus website live-chat. Runs entirely on your own VPS
and database — no third-party message brokers.

## Architecture

Two processes, one repository, one Postgres database:

| Process  | What it does                                                              |
| -------- | ------------------------------------------------------------------------- |
| `panel`  | Next.js app: auth, UI, CRUD, REST for the worker, SSE to the browser.     |
| `worker` | Long-running Node service holding live MTProto / WhatsApp sockets.        |

They communicate through:

- **Shared Postgres** — channels, secrets (encrypted), proxies, and a job queue.
- **Postgres LISTEN/NOTIFY** — triggers emit `NOTIFY realtime` on every message,
  conversation and channel change. The panel holds a single shared `LISTEN`
  connection and fans events out over **SSE** to the live inbox (`/api/stream`)
  and to website chat widgets (`/api/livechat/stream`).
- **Internal HTTP** (`127.0.0.1:4000`, guarded by `WORKER_SECRET`) — only used
  for the live WhatsApp QR which lives in worker memory.

All channel secrets (Telegram string sessions, WhatsApp auth state, proxy
credentials) are encrypted at rest with **AES-256-GCM** using `ENCRYPTION_KEY`.

> The panel requires a real PostgreSQL database — set `DATABASE_URL` before
> starting it. There is no demo/in-memory fallback. The worker needs persistent
> outbound sockets and real phone numbers, so it only runs on your VPS.

## Prerequisites

- Node.js 20+
- A PostgreSQL database
- Telegram API credentials from <https://my.telegram.org> (`api_id` / `api_hash`)

## Environment

Copy `.env.example` to `.env` and fill it in. Generate secrets with
`openssl rand -base64 32`. `ENCRYPTION_KEY` **must be identical** for the panel
and the worker.

| Var                  | Used by       | Notes                                  |
| -------------------- | ------------- | -------------------------------------- |
| `DATABASE_URL`       | panel, worker | PostgreSQL connection string           |
| `AUTH_SECRET`        | panel         | Signs session cookies                  |
| `ADMIN_EMAIL/PASSWORD`| panel        | Bootstrap administrator login          |
| `ENCRYPTION_KEY`     | panel, worker | AES-256-GCM key for secrets at rest    |
| `WORKER_SECRET`      | panel, worker | Guards the internal HTTP API           |
| `WORKER_URL`         | panel         | Defaults to `http://127.0.0.1:4000`    |
| `TELEGRAM_API_ID`    | worker        | From my.telegram.org                   |
| `TELEGRAM_API_HASH`  | worker        | From my.telegram.org                   |

## Database migrations

Apply the SQL scripts in `scripts/` in order against your `DATABASE_URL`:

```bash
psql "$DATABASE_URL" -f scripts/001_schema.sql    # managers, sessions
psql "$DATABASE_URL" -f scripts/003_engine.sql    # channels, secrets, proxies, jobs, conversations
psql "$DATABASE_URL" -f scripts/004_realtime.sql  # enriched NOTIFY payloads + live-chat indexes
```

Then apply the remaining incremental migrations in numeric order, e.g.:

```bash
for f in scripts/0[01][0-9]_*.sql; do psql "$DATABASE_URL" -f "$f"; done
```

The latest one — `scripts/016_message_media.sql` — adds the `media_type`,
`media_mime`, `media_name` and `media_ref` columns to `messages`, enabling
inbound media (photos, video, voice/round notes, stickers, documents) and
outgoing Telegram stickers in the inbox.

## Running with pm2

```bash
# Panel
pnpm install
pnpm build

# Worker (runs via tsx — no separate build step)
cd worker && pnpm install && cd ..

# Start both processes
pm2 start ecosystem.config.js
pm2 save && pm2 startup   # persist across reboots
```

The panel listens on `:3000`; put Nginx/Caddy in front for TLS. The worker has
no public surface — keep `:4000` bound to localhost.

## Connecting accounts

1. Sign in to the panel, open **Connections**.
2. (Optional) add a **proxy** to route a session through.
3. **Telegram** — enter the phone number, then the login code Telegram sends to
   the account; if the account has two-step verification, enter the cloud
   password.
4. **WhatsApp** — scan the QR shown in the wizard from WhatsApp ▸ Linked devices.

Once online, incoming messages appear live in the **Inbox** and replies are sent
back through the worker.

## Website live chat

Live-chat channels need no worker — the website talks to the panel directly:

- `POST /api/livechat/ingest` — visitor messages in (authenticated by the
  channel's `lc_…` API key).
- `GET  /api/livechat/stream?key=…&visitor=…` — SSE of agent replies out.

Both are CORS-enabled; the channel's `lc_…` API key is the access boundary, so
the same snippet works on any domain. Add a chat channel in **Connections** to
mint a key, then embed the single widget tag served from the panel itself:

```html
<!-- The one and only install snippet — works on any site, any framework -->
<script async src="https://YOUR_PANEL/widget.js"
        data-support-key="lc_xxx"></script>
```

Everything visual (colours, texts, position, working hours, on/off) is
configured in the admin and fetched live by the key — the snippet only ever
carries the key, so you install once and never touch the site code again.

Visitor messages land in the same **Inbox** as Telegram and WhatsApp; agent
replies stream straight back to the widget in realtime.
