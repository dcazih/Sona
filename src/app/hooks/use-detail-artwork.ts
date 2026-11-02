import { useEffect, useState } from 'react'
import { readyArtwork, rememberArtwork } from '@/cache/artwork'

const failed = new Set<string>()
/** Keep the detail behind its loading gate until its hero can paint. */
export function useDetailArtwork(src?: string) {
  const [finished, setFinished] = useState('')
  const ready = !src || Boolean(readyArtwork(src)) || failed.has(src) || finished === src
  useEffect(() => {
    if (!src || ready) return
    let alive = true
    const image = new Image()
    if (/\/getCoverArt(?:\.view)?(?:\?|$)/.test(src)) image.crossOrigin = 'anonymous'
    image.onload = async () => {
      try { await image.decode() } catch { /* A loaded image can still paint. */ }
      rememberArtwork(src, image)
      if (alive) setFinished(src)
    }
    image.onerror = () => { failed.add(src); if (alive) setFinished(src) }
    image.src = src
    return () => { alive = false }
  }, [src, ready])
  return ready
}
