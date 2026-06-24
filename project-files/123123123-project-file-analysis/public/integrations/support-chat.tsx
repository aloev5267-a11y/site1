"use client"

/**
 * <SupportChat /> — drop-in support chat for React / Next.js sites.
 *
 * The widget is loaded from your own domain via a first-party proxy path
 * (default `/__support`), so the chat and all of its network requests appear to
 * come from your site — nothing third-party shows up in the Network tab.
 *
 * --- 1. Proxy setup (once) ---------------------------------------------------
 * Add a rewrite so `/__support/*` on your domain forwards to the chat server.
 *
 *   // next.config.js
 *   async rewrites() {
 *     return [
 *       {
 *         source: "/__support/:path*",
 *         destination: "https://YOUR-CHAT-SERVER/:path*",
 *       },
 *     ]
 *   }
 *
 * --- 2. Mount the component (once) ------------------------------------------
 * Render it once near the root of your app (e.g. in `app/layout.tsx` or
 * `pages/_app.tsx`). It renders nothing visible itself.
 *
 *   import { SupportChat } from "@/components/support-chat"
 *   // ...
 *   <SupportChat apiKey="lc_xxxxxxxx" />
 *
 * That's it. Everything else (colours, greeting, working hours, messengers) is
 * configured remotely and applied live without code changes.
 */

import { useEffect } from "react"

export interface SupportChatProps {
  /** Your channel key (looks like `lc_xxxxxxxx`). Required. */
  apiKey: string
  /**
   * First-party path that proxies to the chat server. Must match the rewrite
   * you configured. Defaults to `/__support`. Use `""` only if you load the
   * widget directly from the chat server's own domain (not recommended for
   * a fully first-party setup).
   */
  basePath?: string
  /** Optional bootstrap fallbacks shown only until the live config loads. */
  title?: string
  color?: string
  greeting?: string
  /** Pre-fill the visitor's display name (e.g. from your auth session). */
  name?: string
  /** Pre-fill the conversation subject. */
  subject?: string
}

// A page should only ever load the widget script once, even with fast refresh,
// multiple mounts, or React Strict Mode double-invoking effects.
const SCRIPT_ELEMENT_ID = "support-chat-loader"

export function SupportChat({
  apiKey,
  basePath = "/__support",
  title,
  color,
  greeting,
  name,
  subject,
}: SupportChatProps) {
  useEffect(() => {
    if (!apiKey) {
      // Misconfiguration: fail quietly in production, hint in dev.
      if (process.env.NODE_ENV !== "production") {
        console.warn("[SupportChat] `apiKey` is required — widget not loaded.")
      }
      return
    }

    // Already present (e.g. another mount / client-side navigation): reuse it.
    if (document.getElementById(SCRIPT_ELEMENT_ID)) return

    // Normalise the base path: no trailing slash, leading slash enforced.
    const base = basePath
      ? "/" + basePath.replace(/^\/+|\/+$/g, "")
      : ""

    const script = document.createElement("script")
    script.id = SCRIPT_ELEMENT_ID
    script.async = true
    script.src = `${base}/widget.js`
    script.setAttribute("data-support-key", apiKey)
    if (title) script.setAttribute("data-support-title", title)
    if (color) script.setAttribute("data-support-color", color)
    if (greeting) script.setAttribute("data-support-greeting", greeting)
    if (name) script.setAttribute("data-support-name", name)
    if (subject) script.setAttribute("data-support-subject", subject)

    document.body.appendChild(script)

    // We intentionally do NOT remove the script on unmount: the chat panel is a
    // persistent, app-wide widget and tearing it down on every route change
    // would drop the live connection and the visitor's open conversation.
  }, [apiKey, basePath, title, color, greeting, name, subject])

  return null
}

export default SupportChat
