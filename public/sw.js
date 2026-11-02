/* Sona service worker: network-first application updates, opt-in audio cache.
   Previous cache-first JS/CSS/favicon policy could freeze old branding/UI. */
const APP_CACHE = 'sona-app-v33'
const ARTWORK_CACHE = 'sona-artwork-v5'
let artworkWrites = 0
const MEDIA_CACHE = 'sona-media-v1'
let mediaPreferences = { enabled: true, maxTracks: 40, allowCellular: false }

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
  const excess = requests.length - Math.max(10, Number(mediaPreferences.maxTracks) || 40)
  if (excess > 0) await Promise.all(requests.slice(0, excess).map((request) => cache.delete(request)))
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  // Covers are immutable for a given artwork id. Serve them from persistent
  // storage first, including authenticated cross-origin Navidrome image URLs.
  if (/\/rest\/getCoverArt(?:\.view)?$/.test(url.pathname) ||
    (request.destination === 'image' && !/(?:favicons|pwa-startup|sona-(?:app-icon|icon|brand|white-note)|apple-touch)/.test(url.pathname))) {
    event.respondWith((async () => {
      let cache
      try { cache = await caches.open(ARTWORK_CACHE) } catch { return fetch(request) }
      const cached = await cache.match(request) || await caches.match(request, { cacheName: 'sona-images-v3' })
      const usableCachedImage = cached && (cached.type === 'opaque' || (cached.headers.get('content-type') || '').startsWith('image/'))
      if (usableCachedImage && !(cached.type === 'opaque' && request.mode !== 'no-cors')) return cached
      const response = await fetch(request)
      if ((response.ok && (response.headers.get('content-type') || '').startsWith('image/')) || response.type === 'opaque') {
        event.waitUntil((async () => {
          await cache.put(request, response.clone())
          if (++artworkWrites % 32 === 0) {
            const keys = await cache.keys()
            await Promise.all(keys.slice(0, Math.max(0, keys.length - 1600)).map(key => cache.delete(key)))
          }
        })().catch(() => {}))
      }
      return response
    })())
    return
  }
  if (url.origin !== self.location.origin) return

  if (/\/rest\/stream(?:\.view)?/.test(url.pathname)) {
    // CacheStorage rejects partial 206 responses. Let range playback stay on
    // the direct network path so caching can never break seeking or startup.
    if (request.headers.has('range')) return
    event.respondWith((async () => {
      if (!mediaPreferences.enabled) return fetch(request)
      const cache = await caches.open(MEDIA_CACHE)
      const cached = await cache.match(request)
      if (cached) return cached
      const response = await fetch(request)
      if (response.status === 200 && response.type === 'basic') {
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

  if (/\.(?:js|css|woff2?|ttf|png|svg|ico|webp|gif)$/.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(APP_CACHE)
      // Prefer new assets immediately; fall back to cached assets only if offline.
      try {
        const response = await fetch(request)
        if (response.ok) {
          await cache.put(request, response.clone())
          return response
        }
        return (await cache.match(request)) || response
      } catch (error) {
        const cached = await cache.match(request)
        if (cached) return cached
        throw error
      }
    })())
  }
})
