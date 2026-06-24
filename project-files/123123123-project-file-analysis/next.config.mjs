/** @type {import('next').NextConfig} */

// Widget loaders + service workers must never be cached aggressively, or
// browsers/CDNs keep serving an old (possibly broken) copy after a fix ships.
const noCache = { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }
// Service workers served under a first-party prefix (e.g. /__support/widget-sw.js)
// still need to control the whole origin (scope '/'). This header authorises it.
const swAllowRoot = { key: 'Service-Worker-Allowed', value: '/' }

const nextConfig = {
  // Do not advertise the framework in response headers (X-Powered-By: Next.js).
  // One less signal that reveals what is running behind a first-party proxy.
  poweredByHeader: false,
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      // Neutral, brand-free public name for the widget loader. The original
      // /livechat.js path keeps working for already-deployed snippets.
      { source: '/widget.js', destination: '/livechat.js' },
    ]
  },
  async headers() {
    return [
      {
        source: '/livechat.js',
        headers: [noCache],
      },
      {
        // Neutral alias (rewritten to /livechat.js).
        source: '/widget.js',
        headers: [noCache],
      },
      {
        // Visitor service worker (Web Push + installability).
        source: '/widget-sw.js',
        headers: [noCache, swAllowRoot],
      },
      {
        // Legacy visitor service worker, kept for older installs.
        source: '/omnidesk-sw.js',
        headers: [noCache, swAllowRoot],
      },
    ]
  },
}

export default nextConfig
