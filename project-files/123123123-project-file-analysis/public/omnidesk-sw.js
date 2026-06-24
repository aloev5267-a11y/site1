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

// ---------------------------------------------------------------------------
// Web Push: turn a server-sent push into a visible notification.
//
// Omnidesk delivers operator/autopilot replies via the standard Web Push
// protocol. The payload is a small JSON object: { title, body, url, tag }.
// Without this handler the push arrives but nothing is shown to the visitor.
// ---------------------------------------------------------------------------
self.addEventListener('push', function (event) {
  var data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (e) {
    try {
      data = { body: event.data ? event.data.text() : '' }
    } catch (e2) {
      data = {}
    }
  }

  var title = data.title || 'Новое сообщение'
  var options = {
    body: data.body || '',
    tag: data.tag || 'omnidesk-reply',
    // Replace an existing bubble with the same tag instead of stacking.
    renotify: true,
    // Stash the click target for the notificationclick handler below.
    data: { url: data.url || '/' },
  }
  if (data.icon) options.icon = data.icon

  event.waitUntil(self.registration.showNotification(title, options))
})

// Focus an already-open tab of the site (or open one) when the notification is
// clicked, so the visitor lands back on the page hosting the chat widget.
self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  var target =
    (event.notification.data && event.notification.data.url) || '/'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(function (clientList) {
        for (var i = 0; i < clientList.length; i++) {
          var client = clientList[i]
          if ('focus' in client) {
            try {
              return client.focus()
            } catch (e) {}
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(target)
        }
      }),
  )
})
