import type { MouseEvent } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import { ROUTES } from '@/routes/routesList'
import { queryClient } from '@/lib/queryClient'
import { subsonic } from '@/service/subsonic'
import { queryKeys } from '@/utils/queryKeys'

type Source = { albumId: string; image: string; selector: string }
let lastSource: Source | null = null
let cancelMorph: (() => void) | undefined

function mobileMotion() {
  return window.innerWidth < 768 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
function coverFor(target: HTMLElement): HTMLImageElement | null {
  return target.querySelector('img')
    || target.closest('[data-testid^="preview-list-carousel-item"]')?.querySelector('img')
    || target.closest('[data-testid="card-image-link"]')?.querySelector('img')
    || target.closest('.cursor-pointer')?.querySelector('img')
    || null
}

/** Move a decoded cover with transform/opacity only. The actual page renders
 * immediately; no expanding layout boxes, giant blur or delayed ghost fade. */
function morphAfterNavigation(image: string, from: DOMRect, destination: () => HTMLElement | null) {
  cancelMorph?.()
  const artwork = document.createElement('img')
  artwork.className = 'sona-album-morph-artwork'
  artwork.src = image
  artwork.alt = ''
  artwork.setAttribute('aria-hidden', 'true')
  Object.assign(artwork.style, { left: '0px', top: '0px', width: `${from.width}px`, height: `${from.height}px`,
    transform: `translate3d(${from.left}px,${from.top}px,0)` })
  document.body.appendChild(artwork)
  document.documentElement.dataset.sonaAlbumMorph = 'active'
  let target: HTMLElement | null = null
  let animation: Animation | undefined
  let frame = 0
  let oldVisibility = ''
  let cleaned = false
  const cleanup = () => {
    if (cleaned) return
    cleaned = true
    cancelAnimationFrame(frame)
    animation?.cancel()
    artwork.remove()
    delete document.documentElement.dataset.sonaAlbumMorph
    if (target) target.style.visibility = oldVisibility
    if (cancelMorph === cleanup) cancelMorph = undefined
  }
  cancelMorph = cleanup
  // React Router commits the route before this frame. Measure its real cover,
  // including restored list scroll on back, rather than guessing before mount.
  frame = requestAnimationFrame(() => {
    target = destination()
    if (!target) { cleanup(); return }
    const to = target.getBoundingClientRect()
    if (to.width < 1 || to.height < 1) { cleanup(); return }
    oldVisibility = target.style.visibility
    target.style.visibility = 'hidden'
    animation = artwork.animate([
      { transform: `translate3d(${from.left}px,${from.top}px,0) scale(1,1)`, opacity: 1 },
      { transform: `translate3d(${to.left}px,${to.top}px,0) scale(${to.width / from.width},${to.height / from.height})`, opacity: 1 },
    ], { duration: 280, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' })
    animation.finished.then(cleanup).catch(cleanup)
  })
}

export function openSonaAlbumFromCover(event: MouseEvent<HTMLElement>, navigate: NavigateFunction, albumId: string) {
  const path = ROUTES.ALBUM.PAGE(albumId)
  void queryClient.prefetchQuery({
    queryKey: [queryKeys.album.single, albumId],
    queryFn: () => subsonic.albums.getOne(albumId), staleTime: 10 * 60 * 1000,
  })
  const element = coverFor(event.currentTarget)
  const image = element?.currentSrc || element?.src
  const rect = element?.getBoundingClientRect()
  if (mobileMotion() && image && rect && rect.width >= 12) {
    const featured = element.closest('[data-sona-featured-song-id]')
    const rail = element.closest('.sona-music-rail')
    const scope = rail ? '.sona-music-rail[aria-label="' + CSS.escape(rail.getAttribute('aria-label') || '') + '"] ' : ''
    const selector = featured
      ? '[data-sona-featured-song-id="' + CSS.escape(featured.getAttribute('data-sona-featured-song-id') || '') + '"] img'
      : '[data-sona-album-id="' + CSS.escape(albumId) + '"] img'
    lastSource = { albumId, image, selector: scope + selector }
    morphAfterNavigation(image, rect, () => document.querySelector('.sona-mobile-album-cover'))
  }
  navigate(path)
}

export function closeSonaAlbumToCover(navigate: NavigateFunction, albumId: string) {
  const source = lastSource
  const cover = document.querySelector<HTMLElement>('.sona-mobile-album-cover')
  if (mobileMotion() && source?.albumId === albumId && cover) {
    morphAfterNavigation(source.image, cover.getBoundingClientRect(), () =>
      document.querySelector(source.selector))
  }
  lastSource = null
  navigate(-1)
}
