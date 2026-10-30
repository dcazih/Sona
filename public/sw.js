/* Sona service worker: network-first application updates, opt-in audio cache.
   Previous cache-first JS/CSS/favicon policy could freeze old branding/UI. */
const APP_CACHE = 'sona-app-v5'
const MEDIA_CACHE = 'sona-media-v1'
let mediaPreferences = { enabled: true, maxTracks: 5, allowCellular: false }

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil((async () => {
  const keys = await caches.keys()
  await Promise.all(keys.filter((key) => key.startsWith('sona-app-') && key !== APP_CACHE)
    .map((key) => caches.delete(key)))
  await self.clients.claim()
})()))

self.addEventListener('message', (event) => {
  if (event.data?.type === 'sona-media-cache-preferences') {
    mediaPreferences = { ...mediaPreferences, ...event.data }
  }
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

async function trimMediaCache(cache) {
  const requests = await cache.keys()
  const excess = requests.length - Math.max(1, Number(mediaPreferences.maxTracks) || 5)
  if (excess > 0) await Promise.all(requests.slice(0, excess).map((request) => cache.delete(request)))
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (/\/rest\/stream(?:\.view)?/.test(url.pathname)) {
    event.respondWith((async () => {
      if (!mediaPreferences.enabled) return fetch(request)
      const cache = await caches.open(MEDIA_CACHE)
      const cached = await cache.match(request)
      if (cached) return cached
      const response = await fetch(request)
      if (response.ok && response.type === 'basic') {
        await cache.put(request, response.clone())
        await trimMediaCache(cache)
      }
      return response
    })())
    return
  }

  // Never cache the app shell or authentication endpoints. Network-first
  // assets ensure a new deployment does not retain a stale theme/favicon.
  if (request.mode === 'navigate' || /\/(?:rest|api)\//.test(url.pathname)) return

  if (/\.(?:js|css|woff2?|ttf|png|svg|ico|webp)$/.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(APP_CACHE)
      try {
        const response = await fetch(request, { cache: 'no-cache' })
        if (response.ok) await cache.put(request, response.clone())
        return response
      } catch (error) {
        const cached = await cache.match(request)
        if (cached) return cached
        throw error
      }
    })())
  }
})
