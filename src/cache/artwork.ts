/** Retain decoded covers across route mounts and requested display sizes. */
type DecodedArtwork = { src: string; image: HTMLImageElement; width: number }
const decoded = new Map<string, DecodedArtwork>()
const MAX_DECODED = 384

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
    decoded.delete(key)
    const retained = image.parentNode ? image.cloneNode(false) as HTMLImageElement : image
    decoded.set(key, { src, image: retained, width: image.naturalWidth })
  }
  while (decoded.size > MAX_DECODED) decoded.delete(decoded.keys().next().value!)
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
