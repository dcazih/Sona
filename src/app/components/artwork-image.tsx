import { useEffect, useState, type ImgHTMLAttributes } from 'react'
import { SonaNoteGlyph } from '@/app/components/header/sona-note-glyph'
import { readyArtwork, rememberArtwork } from '@/cache/artwork'
import { cn } from '@/lib/utils'

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src?: string
  wrapperClassName?: string
}
function initial(src?: string) {
  const ready = readyArtwork(src)
  return { requested: src, display: ready?.src || src, loaded: Boolean(ready) }
}

/** A decoded cover remains visible while a larger copy loads in the background. */
export function ArtworkImage({ src, alt = '', className, wrapperClassName, onLoad, onError, ...props }: Props) {
  const crossOrigin = props.crossOrigin ?? (/\/getCoverArt(?:\.view)?(?:\?|$)/.test(src || '') ? 'anonymous' : undefined)
  const [state, setState] = useState(() => initial(src))
  const current = state.requested === src ? state : initial(src)

  useEffect(() => {
    const next = initial(src)
    setState(old => old.requested === src ? old : next)
    if (!src || next.display === src) return
    const available = readyArtwork(src)
    let requestedSize = 0
    try { requestedSize = Number(new URL(src, window.location.href).searchParams.get('size')) } catch {}
    if (requestedSize > 0 && available && available.width >= requestedSize) return
    let cancelled = false
    const upgrade = new Image()
    upgrade.crossOrigin = crossOrigin ?? null
    upgrade.onload = async () => {
      try { await upgrade.decode() } catch { /* onload still confirms a usable image */ }
      if (cancelled) return
      rememberArtwork(src, upgrade)
      setState({ requested: src, display: src, loaded: true })
    }
    upgrade.src = src
    return () => { cancelled = true; upgrade.onload = null }
  }, [src, crossOrigin])

  return <span className={cn('sona-artwork-shell', wrapperClassName)}>
    {!current.loaded && <span className="sona-artwork-note-fallback" aria-hidden="true"><SonaNoteGlyph /></span>}
    {current.display && <img {...props} crossOrigin={crossOrigin} src={current.display} alt={alt}
      className={cn('sona-artwork-managed', current.loaded && 'is-loaded', className)}
      onLoad={(event) => {
        rememberArtwork(current.display!, event.currentTarget)
        setState({ requested: src, display: current.display, loaded: true })
        onLoad?.(event)
      }}
      onError={(event) => {
        setState({ requested: src, display: current.display, loaded: false })
        onError?.(event)
      }} />}
  </span>
}
