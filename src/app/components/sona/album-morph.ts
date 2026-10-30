import type { MouseEvent } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import { ROUTES } from '@/routes/routesList'

type Source = { albumId: string; rect: DOMRect; image: string }
let lastSource: Source | null = null
const DURATION = 465
const EASE = 'cubic-bezier(.19,1,.24,1)'

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
function finalCoverRect(): DOMRect {
  const node = document.querySelector<HTMLElement>('.sona-mobile-album-cover')
  if (node) return node.getBoundingClientRect()
  const width = Math.min(window.innerWidth * .67, 290)
  const headerBottom = document.querySelector<HTMLElement>('.sona-header')?.getBoundingClientRect().bottom || 95
  return new DOMRect((window.innerWidth - width) / 2, headerBottom + 18, width, width)
}
function backRect(source: Source): DOMRect {
  const visible = document.querySelector<HTMLElement>(
    '[data-sona-album-id="' + CSS.escape(source.albumId) + '"]'
  )
  const img = visible?.querySelector('img')
  return img?.getBoundingClientRect() || source.rect
}

function animateMorph(image: string, from: DOMRect, to: DOMRect, entering: boolean) {
  const layer = document.createElement('div')
  layer.className = 'sona-album-morph'
  const surface = document.createElement('div')
  surface.className = 'sona-album-morph-surface'
  const soft = document.createElement('div')
  soft.className = 'sona-album-morph-ambient'
  soft.style.backgroundImage = 'url("' + image.replace(/"/g, '%22') + '")'
  surface.append(soft)
  const artwork = document.createElement('img')
  artwork.className = 'sona-album-morph-artwork'
  artwork.src = image
  artwork.alt = ''
  layer.append(surface, artwork)
  document.body.appendChild(layer)

  const fullW = window.innerWidth
  const fullH = window.innerHeight
  const border = entering ? ['18px','0px'] : ['0px','18px']
  const surfaceFrom = entering ? from : new DOMRect(0, 0, fullW, fullH)
  const surfaceTo = entering ? new DOMRect(0, 0, fullW, fullH) : to

  function frames(a: DOMRect, b: DOMRect, radiusA: string, radiusB: string) {
    return [
      { left:a.left+'px', top:a.top+'px', width:a.width+'px',
        height:a.height+'px', borderRadius:radiusA },
      { left:b.left+'px', top:b.top+'px', width:b.width+'px',
        height:b.height+'px', borderRadius:radiusB },
    ]
  }
  surface.animate(frames(surfaceFrom,surfaceTo,border[0],border[1]), {
    duration:DURATION,easing:EASE,fill:'forwards',
  })
  artwork.animate(frames(from,to,'13px','13px'), {
    duration:DURATION,easing:EASE,fill:'forwards',
  })
  surface.animate([{opacity: entering ? .55 : 1},{opacity: entering ? 1 : .5}], {
    duration:DURATION,easing:EASE,fill:'forwards',
  })

  // Render the destination below the ghost. Its real album art takes over
  // once the source-to-destination motion completes, without a white flash.
  window.setTimeout(() => {
    const fade = layer.animate([{opacity:1},{opacity:0}],{
      duration:210,easing:'ease-out',fill:'forwards',
    })
    fade.finished.then(() => layer.remove()).catch(() => layer.remove())
  }, DURATION + 65)
  window.setTimeout(() => layer.remove(), 1400)
}

export function openSonaAlbumFromCover(
  event: MouseEvent<HTMLElement>, navigate: NavigateFunction, albumId: string,
) {
  const path = ROUTES.ALBUM.PAGE(albumId)
  if (!mobileMotion()) { navigate(path); return }
  const sourceElement = coverFor(event.currentTarget)
  const image = sourceElement?.currentSrc || sourceElement?.src
  const rect = sourceElement?.getBoundingClientRect()
  if (!image || !rect || rect.width < 12) { navigate(path); return }
  lastSource = { albumId, rect, image }
  animateMorph(image,rect,finalCoverRect(),true)
  navigate(path)
}

export function closeSonaAlbumToCover(navigate: NavigateFunction, albumId: string) {
  if (!mobileMotion() || !lastSource || lastSource.albumId !== albumId) {
    navigate(-1)
    return
  }
  const from = finalCoverRect()
  const source = lastSource
  animateMorph(source.image,from,backRect(source),false)
  lastSource = null
  navigate(-1)
}
