const CACHE_NAME = 'sona-images-v3'
const MAX_MEMORY_IMAGES = 300
const MAX_PERSISTENT_IMAGES = 600

const memoryImages = new Map<string, string>()
const warmingImages = new Set<string>()
const scheduledImages = new Set<string>()

function touchMemoryImage(url: string, src: string) {
  memoryImages.delete(url)
  memoryImages.set(url, src)

  while (memoryImages.size > MAX_MEMORY_IMAGES) {
    const oldest = memoryImages.entries().next().value as
      | [string, string]
      | undefined
    if (!oldest) break
    memoryImages.delete(oldest[0])
    URL.revokeObjectURL(oldest[1])
  }
}

async function warmImage(url: string) {
  if (warmingImages.has(url) || memoryImages.has(url)) return
  warmingImages.add(url)

  try {
    const cache = await caches.open(CACHE_NAME)
    let response = await cache.match(url)

    if (!response) {
      const networkResponse = await fetch(url, { cache: 'force-cache' })
      if (!networkResponse.ok) return
      response = networkResponse.clone()
      await cache.put(url, networkResponse)
      const keys = await cache.keys()
      if (keys.length > MAX_PERSISTENT_IMAGES) {
        await Promise.all(keys.slice(0, keys.length - MAX_PERSISTENT_IMAGES)
          .map((request) => cache.delete(request)))
      }
    }

    const blob = await response.blob()
    if (blob.size > 0) touchMemoryImage(url, URL.createObjectURL(blob))
  } catch {
    // The direct image URL remains active if CacheStorage is unavailable or
    // the background warm-up fails.
  } finally {
    warmingImages.delete(url)
  }
}

function scheduleWarm(url: string) {
  if (scheduledImages.has(url) || warmingImages.has(url) || memoryImages.has(url)) return
  scheduledImages.add(url)
  const run = () => {
    scheduledImages.delete(url)
    void warmImage(url)
  }
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(run, { timeout: 800 })
  } else {
    window.setTimeout(run, 80)
  }
}

export async function getCachedImage(url: string): Promise<string> {
  const cached = memoryImages.get(url)
  if (cached) {
    touchMemoryImage(url, cached)
    return cached
  }

  // Never block first paint on CacheStorage, a full download, or Blob work.
  // The browser renders this stable authenticated URL immediately while the
  // persistent and in-memory tiers warm during idle time for later mounts.
  scheduleWarm(url)
  return url
}
