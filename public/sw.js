/* Cleaning Roster service worker
 * Three rules:
 *   1. Navigations: network first, cached index.html only when offline, so the
 *      page is always the latest build
 *   2. Static assets (js/css/images): cache first, refreshed in the background
 *   3. Firebase data: never cached — the roster has to be live
 */
const VERSION = 'v1'
const SHELL = `shell-${VERSION}`
const ASSETS = `assets-${VERSION}`
const SCOPE = new URL(self.registration.scope)
const INDEX = new URL('index.html', SCOPE).toString()

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL)
      .then((c) => c.add(new Request(INDEX, { cache: 'reload' })))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== SHELL && k !== ASSETS).map((k) => caches.delete(k)),
      ))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Database traffic always goes to the network, never into a cache
  if (url.hostname.endsWith('firebasedatabase.app')) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(SHELL).then((c) => c.put(INDEX, copy))
          return res
        })
        .catch(() => caches.match(INDEX).then((r) => r ?? Response.error())),
    )
    return
  }

  if (url.origin !== self.location.origin) return

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(ASSETS).then((c) => c.put(request, copy))
          }
          return res
        })
        .catch(() => cached ?? Response.error())
      return cached ?? network
    }),
  )
})
