const APP_CACHE = 'sona-app-v1'
const MEDIA_CACHE = 'sona-media-v1'
let mediaPreferences = { enabled: true, maxTracks: 5, allowCellular: false }

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('message', (event) => {
  if (event.data?.type === 'sona-media-cache-preferences') {
    mediaPreferences = { ...mediaPreferences, ...event.data }
  }
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
  const isStream = /\/rest\/stream(?:\.view)?/.test(url.pathname)
  if (isStream) {
    event.respondWith((async () => {
      const cache = await caches.open(MEDIA_CACHE)
      const cached = await cache.match(request)
      if (cached) return cached
      const response = await fetch(request)
      if (mediaPreferences.enabled && response.ok && response.type === 'basic') {
        await cache.put(request, response.clone())
        await trimMediaCache(cache)
      }
      return response
    })())
    return
  }
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.woff') || url.pathname.endsWith('.woff2') || url.pathname.endsWith('.ttf') || url.pathname.endsWith('.png') || url.pathname.endsWith('.svg')) {
    event.respondWith((async () => {
      const cache = await caches.open(APP_CACHE)
      const cached = await cache.match(request)
      if (cached) return cached
      const response = await fetch(request)
      if (response.ok) await cache.put(request, response.clone())
      return response
    })())
  }
})
