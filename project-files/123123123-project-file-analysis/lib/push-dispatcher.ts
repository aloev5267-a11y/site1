import 'server-only'
import { getLivechatApiKeyByChannelId, isConversationMuted } from './data'
import {
  isPushConfigured,
  sendPushToManager,
  sendPushToVisitor,
} from './push'
import { type RealtimeEvent, subscribeRealtime } from './realtime'

/**
 * Long-lived push dispatcher.
 *
 * Started once on server boot (see instrumentation.ts). It subscribes to the
 * SAME shared realtime hub the SSE inbox uses, so it reuses the single Postgres
 * LISTEN connection — no new subsystem, no extra DB load. For every NEW inbound
 * message it sends a Web Push to that conversation's manager, which means
 * notifications arrive even when no browser tab is open (the whole point of
 * push). Outbound messages, conversation/channel events and history replays are
 * ignored.
 *
 * The subscription is intentionally permanent: keeping one subscriber alive
 * also keeps the realtime hub connected, and it is created exactly once thanks
 * to the globalThis guard below (so hot reloads / double-imports don't stack
 * duplicate listeners that would send the same push twice).
 */

const globalForDispatcher = globalThis as unknown as {
  __pushDispatcherStarted?: boolean
}

function truncate(text: string, max = 140): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > max ? clean.slice(0, max - 1) + '…' : clean
}

function channelLabel(type?: string): string {
  switch (type) {
    case 'whatsapp':
      return 'WhatsApp'
    case 'telegram':
      return 'Telegram'
    case 'livechat':
      return 'Live chat'
    case 'max':
      return 'MAX'
    default:
      return 'Message'
  }
}

// channelId -> public apiKey, cached so the deep-link lookup doesn't hit the DB
// on every operator reply. Live-chat keys are effectively immutable.
const apiKeyCache = new Map<string, string>()

async function resolveApiKey(channelId: string): Promise<string | null> {
  const cached = apiKeyCache.get(channelId)
  if (cached) return cached
  try {
    const key = await getLivechatApiKeyByChannelId(channelId)
    if (key) apiKeyCache.set(channelId, key)
    return key
  } catch {
    return null
  }
}

/**
 * Notify a website visitor (via their Web Push subscription registered on the
 * /c/<apiKey> page) when an operator/autopilot replies in a live-chat thread.
 * The notification deep-links back to that page so a click reopens the exact
 * conversation — even when no tab is open and even from an installed PWA.
 */
async function handleVisitorReply(event: RealtimeEvent): Promise<void> {
  if (event.channelType !== 'livechat') return
  if (!event.channelId || !event.contactHandle) return

  const apiKey = await resolveApiKey(event.channelId)
  const handle = event.contactHandle
  const sender = event.author?.trim() || 'Оператор'
  const body = event.body ? truncate(event.body) : 'Новый ответ'
  const url = apiKey
    ? `/c/${encodeURIComponent(apiKey)}?v=${encodeURIComponent(handle)}`
    : '/'

  void sendPushToVisitor(event.channelId, handle, {
    title: sender,
    body,
    url,
    tag: `lc:${event.channelId}:${handle}`,
  }).catch(() => {
    /* delivery failures are handled/logged inside sendPushToVisitor */
  })
}

async function handleEvent(event: RealtimeEvent): Promise<void> {
  if (event.type !== 'message') return
  // Only brand-new messages notify. Message UPDATE events (status→read,
  // reactions, soft-delete) reuse type:'message' + direction, so without this
  // guard every status change would fire a duplicate push. Legacy events with
  // no `event` field are treated as inserts for back-compat.
  if (event.event && event.event !== 'insert') return

  // Outbound live-chat reply → push the website visitor.
  if (event.direction === 'out') {
    await handleVisitorReply(event)
    return
  }

  // Only brand-new inbound messages should notify managers.
  if (event.direction !== 'in') return
  if (!event.managerId) return

  // Respect per-conversation mute: silenced contacts never push.
  if (event.conversationId) {
    try {
      if (await isConversationMuted(event.conversationId)) return
    } catch {
      /* on lookup failure, fall through and notify rather than drop silently */
    }
  }

  const sender =
    event.contactName?.trim() ||
    event.contactHandle?.trim() ||
    'New message'
  const channel = channelLabel(event.channelType)
  const title = `${sender} · ${channel}`
  const body = event.body ? truncate(event.body) : 'New message received'

  void sendPushToManager(event.managerId, {
    title,
    body,
    url: '/app/inbox',
    // Collapse repeated messages from the same conversation into one bubble.
    tag: event.conversationId
      ? `conv:${event.conversationId}`
      : `mgr:${event.managerId}`,
  }).catch(() => {
    /* delivery failures are handled/logged inside sendPushToManager */
  })
}

/** Idempotently start the dispatcher. Safe to call multiple times. */
export function startPushDispatcher(): void {
  if (globalForDispatcher.__pushDispatcherStarted) return
  if (!isPushConfigured()) {
    // No VAPID keys yet — nothing to dispatch. We don't subscribe so we don't
    // hold the realtime hub open for no reason; once keys are added and the
    // server restarts, this will run.
    return
  }
  globalForDispatcher.__pushDispatcherStarted = true
  subscribeRealtime((event) => {
    void handleEvent(event).catch(() => {
      /* never let a notification error crash the realtime hub */
    })
  })
}
