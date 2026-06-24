import type { LivechatChannel } from './data'

/**
 * Helpers shared by the public live-chat endpoints
 * (app/api/livechat/ingest + app/api/livechat/stream).
 *
 * The widget runs on the customer's own website (a different origin from the
 * panel), so every response needs CORS headers. We reflect the request Origin
 * when it matches the domain configured on the channel; otherwise we fall back
 * to the configured domain. This keeps the API usable cross-origin while still
 * being scoped to the site that owns the API key.
 */

/**
 * Parse the channel's `domain` field into a list of allowed-origin entries.
 *
 * The field accepts:
 *   - a single host:           `acme.com`
 *   - several hosts:           `acme.com, staging.acme.com, localhost:3000`
 *     (comma, space or newline separated — handy when one widget runs on
 *     multiple sites)
 *   - a wildcard:              `*` (allow every origin)
 *   - wildcard subdomains:     `*.acme.com`
 */
export function parseAllowedDomains(domain: string | null | undefined): string[] {
  return String(domain ?? '')
    .split(/[\s,]+/)
    .map((d) => d.trim())
    .filter(Boolean)
}

/** Match a request host against one allowed-domain pattern (supports `*.x`). */
function matchDomain(host: string, pattern: string): boolean {
  if (pattern === '*') return true
  if (pattern.startsWith('*.')) {
    const base = pattern.slice(2)
    return host === base || host.endsWith('.' + base)
  }
  return host === pattern
}

/**
 * Origin gate for the public live-chat endpoints.
 *
 * Behaviour is opt-in per channel via the `domain` field:
 *   - empty / not set        → allow any origin (back-compat: the API key is
 *                              the only boundary, same as before)
 *   - contains `*`           → allow any origin (explicit wildcard)
 *   - one or more hosts      → ENFORCE: the request Origin's host must match one
 *                              of them (exact or `*.base` subdomain). A missing
 *                              Origin (non-browser / curl) is rejected.
 *
 * This lets security-conscious site owners lock the widget to their domain(s)
 * without breaking the many installs that never configured one.
 */
export function originAllowed(
  origin: string | null,
  channel: Pick<LivechatChannel, 'domain'>,
): boolean {
  const domains = parseAllowedDomains(channel.domain)
  if (domains.length === 0) {
    // No domain configured. By default we stay permissive for back-compat
    // (the API key is the boundary). Operators can flip LIVECHAT_STRICT_ORIGIN
    // to require an explicit domain allow-list on every channel, which denies
    // any channel that hasn't opted in.
    return process.env.LIVECHAT_STRICT_ORIGIN !== 'true'
  }
  if (domains.includes('*')) return true
  if (!origin) return false
  let host: string
  try {
    host = new URL(origin).host.toLowerCase()
  } catch {
    return false
  }
  return domains.some((d) => matchDomain(host, d.toLowerCase()))
}

/**
 * Best-effort client IP from the proxy headers. Used as a rate-limit key, never
 * trusted for anything security-critical (it can be spoofed unless the upstream
 * proxy is trusted — which on a VPS reverse-proxy setup it is).
 */
export function clientIp(headers: Headers): string {
  return (
    (headers.get('x-forwarded-for')?.split(',')[0] ?? '').trim() ||
    headers.get('x-real-ip')?.trim() ||
    headers.get('cf-connecting-ip')?.trim() ||
    'unknown'
  )
}

/** Standard 429 response for the live-chat endpoints. */
export function tooMany(
  cors: Record<string, string>,
  retryAfterSec: number,
): Response {
  return new Response(
    JSON.stringify({ ok: false, error: 'rate_limited' }),
    {
      status: 429,
      headers: {
        ...cors,
        'content-type': 'application/json',
        'retry-after': String(Math.max(1, retryAfterSec)),
      },
    },
  )
}

/**
 * Build CORS headers. We reflect the request Origin (required when the widget
 * sends credentials) and vary on Origin so caches stay correct.
 */
export function corsHeaders(origin: string | null): Record<string, string> {
  return {
    'access-control-allow-origin': origin ?? '*',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    vary: 'Origin',
  }
}

/** Standard preflight response for the live-chat endpoints. */
export function preflight(origin: string | null): Response {
  return new Response(null, { status: 204, headers: corsHeaders(origin) })
}

/** Normalize a visitor id into a stable, safe conversation handle. */
export function visitorHandle(raw: unknown): string {
  const s = String(raw ?? '').trim()
  // Accept the widget-generated id (uuid-ish) but cap length and strip control
  // chars so it's always a clean key.
  const cleaned = s.replace(/[^\w.\-:]/g, '').slice(0, 80)
  return cleaned || `anon-${Math.random().toString(36).slice(2, 10)}`
}

/** Clamp a visitor display name. */
export function visitorName(raw: unknown): string {
  const s = String(raw ?? '').trim()
  return (s || 'Website visitor').slice(0, 80)
}

/** Clamp a message body. Returns null if empty. */
export function messageBody(raw: unknown): string | null {
  const s = String(raw ?? '').trim()
  if (!s) return null
  return s.slice(0, 4000)
}
