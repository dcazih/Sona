/** Retain decoded covers across route mounts and requested display sizes. */
type DecodedArtwork = { src: string; image: HTMLImageElement; width: number; pixelCount: number }
const decoded = new Map<string, DecodedArtwork>()
const MAX_DECODED = 1024
const MAX_PIXELS = 32 * 1024 * 1024
let retainedPixels = 0
const pixels = (entry: DecodedArtwork) => entry.pixelCount

function identity(src: string) {
  try {
    const url = new URL(src, window.location.href)
    if (/\/getCoverArt(?:\.view)?$/i.test(url.pathname)) url.searchParams.delete('size')
    return url.href
  } catch { return src }
}

export function readyArtwork(src?: string) {
  if (!src) return undefined
  const key = identity(src)
  const entry = decoded.get(key)
  if (entry) {
    decoded.delete(key)
    decoded.set(key, entry)
  }
  return entry
}

export function rememberArtwork(src: string, image: HTMLImageElement) {
  if (!image.complete || !image.naturalWidth) return
  const key = identity(src)
  const old = decoded.get(key)
  if (!old || old.width <= image.naturalWidth) {
    if (old) retainedPixels -= pixels(old)
    decoded.delete(key)
    const retained = image.parentNode ? image.cloneNode(false) as HTMLImageElement : image
    const entry = { src, image: retained, width: image.naturalWidth, pixelCount: image.naturalWidth * image.naturalHeight }
    decoded.set(key, entry)
    retainedPixels += pixels(entry)
  }
  // Keep the current cover and the small discovery set hot; bound large decoded
  // covers so a long browsing session cannot force iOS to discard the whole PWA.
  if (decoded.size <= MAX_DECODED && retainedPixels <= MAX_PIXELS) return
  const activeSrc = document.querySelector<HTMLImageElement>('#track-song-image')?.src
  const activeKey = activeSrc ? identity(activeSrc) : ''
  for (const [candidate, entry] of decoded) {
    if (decoded.size <= MAX_DECODED && retainedPixels <= MAX_PIXELS) break
    if (candidate === activeKey || candidate.includes('/discovery/artists-v1/')) continue
    retainedPixels -= pixels(entry)
    decoded.delete(candidate)
  }
}

// Legacy/native image elements participate in the same decoded artwork cache.
if (typeof document !== 'undefined') {
  document.addEventListener('load', event => {
    if (event.target instanceof HTMLImageElement) {
      const image = event.target
      rememberArtwork(image.currentSrc || image.src, image)
    }
  }, true)
}
