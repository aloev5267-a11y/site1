/*
 * Omnidesk service worker.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * Browsers will only let a site be "installed" as an app (PWA) if it has a
 * service worker with a fetch handler that is served from the SITE'S OWN domain.
 * The Omnidesk widget script is loaded from the Omnidesk panel domain, and
 * browsers forbid registering a service worker across domains for security
 * reasons. So this one tiny file has to live on YOUR site.
 *
 * HOW TO INSTALL
 * --------------
 * Copy this file to the ROOT of your website so it is reachable at:
 *     https://your-site.com/omnidesk-sw.js
 * That's it. The Omnidesk widget detects it, registers it, injects the web app
 * manifest, and can then prompt visitors to install your site as an app.
 *
 * WHAT IT DOES
 * ------------
 * Almost nothing on purpose. It is a transparent pass-through: it does NOT cache
 * your pages, intercept your API calls, or change how your site behaves. Its
 * only job is to satisfy the browser's "installable" requirement. This keeps it
 * safe to drop onto any existing website.
 */

self.addEventListener('install', function () {
  // Activate immediately so installability is available on first load.
  self.skipWaiting()
})

self.addEventListener('activate', function (event) {
  // Take control of open tabs right away.
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', function (event) {
  // Transparent pass-through. We must register a fetch handler for the page to
  // count as installable, but we deliberately do NOT cache or rewrite anything —
  // every request goes straight to the network exactly as it normally would.
  // (No event.respondWith → the browser handles the request natively.)
  void event
})
