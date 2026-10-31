const CACHE_NAME = 'sona-images-v2'
const MAX_MEMORY_IMAGES = 180

const memoryImages = new Map<string, string>()
const warmingImages = new Set<string>()

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
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => void warmImage(url), { timeout: 1200 })
  } else {
    window.setTimeout(() => void warmImage(url), 180)
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
