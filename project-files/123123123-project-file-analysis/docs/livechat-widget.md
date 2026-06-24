# Live-chat widget — developer guide

How the embeddable website chat widget is created in the admin, how to install
it, how integration status is tracked, and how visitor routing behaves. This
mirrors the in-app **Documentation** tab (`/admin/docs`). The public panel
domain used throughout is `charter-panel.com`.

---

## 1. Creating a widget (admin)

Path: **`/admin/livechat`** (component: `components/admin/livechat-admin.tsx`).

Click **Add live chat** and fill in:

| Field | Required | Meaning |
| --- | --- | --- |
| **Name** | no (defaults to `Live chat`) | Internal label shown on the admin card. |
| **Website domain** | yes | The site the widget runs on. Scopes the allowed request origin (see §5). |
| **Manager queue** | yes (≥1) | Ordered list of managers. The selection order **is** the round-robin order; the first manager is the channel owner. |

On save the server (`createLivechatAction`) mints a public API key (`lc_…`) and
creates a `livechat` channel with `status: 'pending'` and
`config = { domain, apiKey, pool, rrCursor }`. A dialog then shows the install
snippet.

### Visual editor (per-site, live)

Each card has a **«Настроить чат»** button → full-screen **widget editor**
(`components/admin/widget-editor.tsx`, action `updateLivechatWidgetConfigAction`)
with a live `<iframe>` preview that renders the **real** widget in preview mode.
Edits are pushed into the iframe over `postMessage`, so the admin sees exactly
what visitors see. Every site is configured **independently**; tabs cover:

- **Вид** — header title, subtitle, agent name + avatar, brand color, side
  (left/right), and the greeting teaser (text + sub-line).
- **Контент** — welcome message shown on open, quick-reply chips, input
  placeholder, and whether to show messenger buttons during working hours.
- **Мессенджеры** — per-site Telegram / WhatsApp / custom buttons.
- **Часы** — per-site working hours (timezone, open/close, weekdays, overnight
  windows) and the off-hours screen copy.
- **Поведение** — auto-open after N seconds.

The whole config is stored under `channels.config.widget` (jsonb — **no schema
migration**), validated server-side by `resolveWidgetConfig` in
`lib/widget-config.ts`. Admin-wide **default working hours** live in
`app_settings` (`livechat_defaults`) and seed any site that hasn't overridden
them (`components/admin/livechat-defaults.tsx`).

**Live updates without reinstalling the snippet:** the widget polls
`GET /api/livechat/config?key=…` every ~15s. The endpoint returns the resolved
per-site config plus an authoritative, server-computed `offHours` flag (from the
site's own working hours via `isOffHoursFor`). The `data-omnidesk-*` attributes
below are now only bootstrap fallbacks used until the first config poll lands.

---

## 2. Getting the embed code

Copy the single async script tag served from `/livechat.js`:

```html
<script async src="https://charter-panel.com/livechat.js"
  data-omnidesk-key="lc_xxx"
  data-omnidesk-title="Чат поддержки"
  data-omnidesk-color="#2563eb"
  data-omnidesk-greeting="Здравствуйте! Чем помочь?"></script>
```

Only `data-omnidesk-key` is required. Optional extras: `data-omnidesk-name`,
`data-omnidesk-subject`. The script auto-mounts a floating launcher + chat panel
(no iframe) and talks to two endpoints:

- `POST /api/livechat/ingest` — visitor → panel sends a message.
- `GET  /api/livechat/stream` — Server-Sent Events: history replay + agent
  replies in realtime.

Both authenticate with the **API key** and the request **Origin**.

---

## 3. Status lifecycle (single source of truth)

`channels.status` is the single source of truth, surfaced by
`isLivechatConnected(channel)` in `lib/data.ts`:

```ts
isLivechatConnected(channel) => channel.status === 'connected'
```

- **`pending`** — created in the admin, the widget has never connected from the
  live site yet. Shown in the admin as **Not integrated**.
- **`connected`** — the widget successfully handshaked from an allowed origin.
  Shown as **Active**.

The `pending → connected` transition is automatic: when the widget opens its
stream from the installed page, `app/api/livechat/stream/route.ts` calls
`markLivechatConnected(channelId)`. This is why the admin never shows a false
"Active" before the chat is really installed, and why `/admin/channels` moves off
`pending` once the site goes live.

---

## 4. Availability — the chat is always reachable

The widget renders whenever the API key resolves to an existing channel and the
origin is allowed. Deleting **managers** never deletes the chat:

- `channels.manager_id` is `ON DELETE SET NULL` (migration `008`), so a live-chat
  channel outlives its owner.
- `deleteManager` strips the removed id from every live-chat `config.pool` and
  deletes only the manager's worker-backed (telegram/whatsapp) channels.

When no manager is available, `POST /api/livechat/ingest` returns
`{ ok: true, noAgents: true }` and **does not** create a conversation. The widget
keeps the chat open and shows a notice:

> «К сожалению, сейчас мы не можем ответить. Оставьте сообщение — мы свяжемся с
> вами, как только освободимся.»

Assign a manager again and routing resumes immediately.

---

## 5. Origin restriction

`originAllowed` (`lib/livechat.ts`):

- If **domain is set**, the request Origin must equal it or be a subdomain.
- If **domain is empty**, any origin is allowed (staging / multi-domain).

---

## 6. Programmatic API & analytics events

```js
OmnideskLiveChat.open({ name, subject, message }) // open + prefill
OmnideskLiveChat.close()
OmnideskLiveChat.on('open',          () => {})
OmnideskLiveChat.on('close',         () => {})
OmnideskLiveChat.on('message_sent',  ({ body, count }) => {})
OmnideskLiveChat.on('first_message', ({ body }) => {})
```

Subscriptions made before the widget mounts are queued and flushed once it is
ready, so calling `.on(...)` from `<head>` is safe. The lower-level
`OmnideskLiveChat.create({ ... })` accepts `onHistory`, `onMessage`, `onStatus`,
and `onActive(active)` callbacks for a fully custom UI.

---

## 7. Where things live

| Concern | Location |
| --- | --- |
| Status definition (source of truth) | `isLivechatConnected` in `lib/data.ts` |
| Mark connected (pending → connected) | `markLivechatConnected` in `lib/data.ts` |
| Agent availability / no-agents check | `resolveLivechatAgentId` in `lib/data.ts` |
| Manager removal keeps the chat | `deleteManager` in `lib/data.ts` + `scripts/008_livechat_status.sql` |
| API key → channel | `getLivechatChannelByApiKey` in `lib/data.ts` |
| API key → channel + resolved widget config | `getLivechatWidgetConfigByApiKey` in `lib/data.ts` |
| Per-site widget config schema + validation | `lib/widget-config.ts` |
| Live widget config (polled by the widget) | `app/api/livechat/config/route.ts` |
| Per-site off-hours computation | `isOffHoursFor` in `lib/offhours.ts` |
| Visual widget editor (live iframe preview) | `components/admin/widget-editor.tsx` |
| Admin-wide default working hours | `components/admin/livechat-defaults.tsx` + `app_settings.livechat_defaults` |
| Stream handshake + connect | `app/api/livechat/stream/route.ts` |
| Inbound + no-agents response | `app/api/livechat/ingest/route.ts` |
| Widget UI + no-agents notice | `public/livechat.js` |
| Admin status badge | `WidgetStatus` in `components/admin/livechat-admin.tsx` |
| In-app documentation tab | `app/admin/docs/page.tsx` |

---

## 8. Migration to apply

Run once on the VPS:

```bash
psql "$DATABASE_URL" -f scripts/008_livechat_status.sql
```

It makes `channels.manager_id` nullable and switches its FK to
`ON DELETE SET NULL` so live-chat channels survive manager deletion.
