import type { MouseEvent } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import { ROUTES } from '@/routes/routesList'
import { readyArtwork } from '@/cache/artwork'
import { queryClient } from '@/lib/queryClient'
import { subsonic } from '@/service/subsonic'
import { queryKeys } from '@/utils/queryKeys'

type Source = { albumId: string; image: string; selector: string }
let lastSource: Source | null = null
let cancelMorph: (() => void) | undefined

function mobileMotion() {
  return (
    window.innerWidth < 768 &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}
function coverFor(target: HTMLElement): HTMLImageElement | null {
  return (
    target.querySelector('img') ||
    target
      .closest('[data-testid^="preview-list-carousel-item"]')
      ?.querySelector('img') ||
    target.closest('[data-testid="card-image-link"]')?.querySelector('img') ||
    target.closest('.cursor-pointer')?.querySelector('img') ||
    null
  )
}

function artworkStyle(element: HTMLElement) {
  const bounds = element.getBoundingClientRect()
  let radius = 0,
    shadow = 'none'
  let node: HTMLElement | null = element
  while (node) {
    const rect = node.getBoundingClientRect()
    if (
      Math.abs(rect.width - bounds.width) > 4 ||
      Math.abs(rect.height - bounds.height) > 4
    )
      break
    const style = getComputedStyle(node)
    radius = Math.max(radius, parseFloat(style.borderTopLeftRadius) || 0)
    if (style.boxShadow !== 'none') shadow = style.boxShadow
    node = node.parentElement
  }
  return { borderTopLeftRadius: radius + 'px', boxShadow: shadow }
}

/** Move a decoded cover with transform/opacity only. The actual page renders
 * immediately; no expanding layout boxes, giant blur or delayed ghost fade. */
function morphAfterNavigation(
  image: string,
  from: DOMRect,
  destination: () => HTMLElement | null,
  sourceStyle: { borderTopLeftRadius: string; boxShadow: string },
) {
  const fromRadius = parseFloat(sourceStyle.borderTopLeftRadius) || 0
  const fromShadow = sourceStyle.boxShadow
  cancelMorph?.()
  const artwork =
    (readyArtwork(image)?.image.cloneNode(false) as HTMLImageElement) ||
    document.createElement('img')
  artwork.removeAttribute('id')
  artwork.loading = 'eager'
  artwork.className = 'sona-album-morph-artwork'
  artwork.src = image
  artwork.alt = ''
  artwork.setAttribute('aria-hidden', 'true')
  Object.assign(artwork.style, {
    borderRadius: `${fromRadius}px`,
    boxShadow: fromShadow,
    left: '0px',
    top: '0px',
    width: `${from.width}px`,
    height: `${from.height}px`,
    transform: `translate3d(${from.left}px,${from.top}px,0)`,
  })
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
    const current = destination()
    if (current && current !== target) current.style.visibility = oldVisibility
    if (cancelMorph === cleanup) cancelMorph = undefined
  }
  cancelMorph = cleanup
  // React Router commits the route before this frame. Measure its real cover,
  // including restored list scroll on back, rather than guessing before mount.
  const started = performance.now()
  const locate = () => {
    target = destination()
    if (!target) {
      if (performance.now() - started < 1500)
        frame = requestAnimationFrame(locate)
      else cleanup()
      return
    }
    const to = target.getBoundingClientRect()
    if (to.width < 1 || to.height < 1) {
      if (performance.now() - started < 1500)
        frame = requestAnimationFrame(locate)
      else cleanup()
      return
    }
    oldVisibility = target.style.visibility
    target.style.visibility = 'hidden'
    const targetStyle = artworkStyle(target)
    const toRadius = parseFloat(targetStyle.borderTopLeftRadius) || 0
    animation = artwork.animate(
      [
        {
          borderRadius: `${fromRadius}px`,
          boxShadow: fromShadow,
          transform: `translate3d(${from.left}px,${from.top}px,0) scale(1,1)`,
          opacity: 1,
        },
        {
          borderRadius: `${toRadius / (to.width / from.width)}px / ${toRadius / (to.height / from.height)}px`,
          boxShadow: targetStyle.boxShadow.replace(
            /(-?[\d.]+)px/g,
            (_, value) => `${Number(value) / (to.width / from.width)}px`,
          ),
          transform: `translate3d(${to.left}px,${to.top}px,0) scale(${to.width / from.width},${to.height / from.height})`,
          opacity: 1,
        },
      ],
      { duration: 480, easing: 'cubic-bezier(.22,.75,.25,1)', fill: 'both' },
    )
    animation.finished.then(cleanup).catch(cleanup)
  }
  frame = requestAnimationFrame(locate)
}

export function openSonaAlbumFromCover(
  event: MouseEvent<HTMLElement>,
  navigate: NavigateFunction,
  albumId: string,
) {
  const path = ROUTES.ALBUM.PAGE(albumId)
  void queryClient.prefetchQuery({
    queryKey: [queryKeys.album.single, albumId],
    queryFn: () => subsonic.albums.getOne(albumId),
    staleTime: 10 * 60 * 1000,
  })
  const element = coverFor(event.currentTarget)
  const image = element?.currentSrc || element?.src
  const rect = element?.getBoundingClientRect()
  if (mobileMotion() && image && rect && rect.width >= 12) {
    const featured = element.closest('[data-sona-featured-song-id]')
    const rail = element.closest('.sona-music-rail')
    const scope = rail
      ? '.sona-music-rail[aria-label="' +
        CSS.escape(rail.getAttribute('aria-label') || '') +
        '"] '
      : ''
    const selector = featured
      ? '[data-sona-featured-song-id="' +
        CSS.escape(featured.getAttribute('data-sona-featured-song-id') || '') +
        '"] img'
      : '[data-sona-album-id="' + CSS.escape(albumId) + '"] img'
    lastSource = { albumId, image, selector: scope + selector }
    morphAfterNavigation(
      image,
      rect,
      () =>
        document.querySelector(
          '.sona-album-page:not(.sona-album-loading) .sona-mobile-album-cover',
        ),
      artworkStyle(element),
    )
  }
  navigate(path)
}

export function closeSonaAlbumToCover(
  navigate: NavigateFunction,
  albumId: string,
) {
  const source = lastSource
  const cover = document.querySelector<HTMLElement>('.sona-mobile-album-cover')
  if (mobileMotion() && source?.albumId === albumId && cover) {
    morphAfterNavigation(
      source.image,
      cover.getBoundingClientRect(),
      () => document.querySelector(source.selector),
      artworkStyle(cover),
    )
  }
  lastSource = null
  navigate(-1)
}
