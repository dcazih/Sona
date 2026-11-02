import { revealMiniPlayerDetails } from '@/app/components/sona/player-detail-flight'
import { getDockBounds } from '@/app/components/sona/dock-bounds'
import { SONA_NOTE_PATH } from '@/app/components/header/sona-note-glyph'
import { useLayoutEffect, useRef } from 'react'

const OPEN_EASE = 'cubic-bezier(.22,.8,.22,1)'
const CLOSE_EASE = 'cubic-bezier(.22,.55,.14,1)'
export const playerDragRadius = (distance: number) =>
  34 * (1 - Math.exp(-Math.max(0, distance) / 28))

/** One composited surface; gestures never re-render the player controls. */
export function usePlayerSheetMotion(open: boolean, onClosed?: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  const animation = useRef<Animation | null>(null)
  const frame = useRef(0)
  const coverGhost = useRef<HTMLDivElement | null>(null)
  const cleanupExtras = useRef<() => void>(() => {})
  const distance = useRef(0)
  const lastCorners = useRef('')
  const dragShape = useRef({ x: 0, sx: 1, sy: 1, height: 1 })
  const dragBackground = useRef<HTMLElement | null>(null)
  const onClosedRef = useRef(onClosed)
  onClosedRef.current = onClosed
  const initialized = useRef(false)

  function flush() {
    cancelAnimationFrame(frame.current)
    frame.current = 0
    const sheet = ref.current
    if (!sheet) return
    const { x, sx, sy } = dragShape.current
    sheet.style.transform = `translate3d(${x}px,${distance.current}px,0) scale(${sx},${sy})`
    if (dragBackground.current) {
      const blend = Math.min(1, distance.current / (dragShape.current.height * .5))
      dragBackground.current.style.opacity = String(1 - blend)
      const glass = ref.current?.querySelector<HTMLElement>('.sona-now-glass')
      if (glass) glass.style.opacity = String(blend)
    }
    const radius = playerDragRadius(distance.current)
    const corners = `${(radius / sx).toFixed(1)}px ${(radius / sx).toFixed(1)}px 0 0 / ${(radius / sy).toFixed(1)}px ${(radius / sy).toFixed(1)}px 0 0`
    if (lastCorners.current !== corners) {
      sheet.style.borderRadius = corners
      lastCorners.current = corners
    }
  }

  function move(y: number) {
    distance.current = Math.max(0, y)
    if (!frame.current) frame.current = requestAnimationFrame(flush)
  }

  function run(expand: boolean) {
    const sheet = ref.current
    if (!sheet) return
    cancelAnimationFrame(frame.current)
    frame.current = 0
    const previousCover = coverGhost.current?.getBoundingClientRect()
    const computed = getComputedStyle(sheet)
    const visualBounds = sheet.getBoundingClientRect()
    const width = sheet.offsetWidth
    const height = sheet.offsetHeight
    const visualCorner =
      parseFloat(computed.borderTopLeftRadius) * (visualBounds.width / width) ||
      0
    const wasClosed = !sheet.dataset.phase || sheet.dataset.phase === 'closed'
    const previousArt = sheet
      .querySelector<HTMLElement>('.sona-now-art')
      ?.getBoundingClientRect()
    const previousPanel = sheet.querySelector<HTMLElement>('.sona-now-panel')
    const panelSnapshot = previousPanel
      ? {
          transform: getComputedStyle(previousPanel).transform,
          opacity: getComputedStyle(previousPanel).opacity,
        }
      : { transform: 'translate3d(0,0,0)', opacity: '1' }
    cleanupExtras.current()
    const mini = document.querySelector<HTMLElement>(
      '.sona-player[data-mobile-active="true"]',
    )
    const target = mini ? getDockBounds(mini) : undefined
    if (expand) { document.documentElement.dataset.sonaPlayerProgress = 'hidden'; delete document.documentElement.dataset.sonaPlayerSettling }
    if (!width || !height) return
    const sx = Math.max(0.01, (target?.layoutWidth || width - 24) / width)
    const sy = Math.max(0.01, (target?.layoutHeight || 50) / height)
    const radius = (target?.layoutHeight || 50) / 2
    const left =
      target && mini
        ? target.left + (target.width - target.layoutWidth) / 2
        : 12
    const top =
      target && mini
        ? target.top + (target.height - target.layoutHeight) / 2
        : height - 110
    const compact = {
      transform: `translate3d(${left}px,${top}px,0) scale(${sx},${sy})`,
      borderRadius: `${radius / sx}px / ${radius / sy}px`,
      opacity: '0',
    }
    const full = {
      transform: 'translate3d(0,0,0) scale(1,1)',
      borderRadius: '0px',
      opacity: '1',
    }
    animation.current?.cancel()
    // Measure the full-size destination before applying the surface animation.
    // Its children have their own inverse transform, so transformed image bounds
    // cannot be divided by the surface matrix to recover layout coordinates.
    sheet.style.transform = 'none'
    const content = sheet.querySelector<HTMLElement>('.sona-now-content')
    const backgroundSurface = sheet.querySelector<HTMLElement>(
      '.sona-now-background',
    )
    if (content) content.style.scale = '1'
    if (backgroundSurface) backgroundSurface.style.scale = '1'
    sheet.dataset.phase = expand ? 'opening' : 'closing'
    sheet.classList.remove('is-dragging')
    // FLIP: visual width and height change via scale, without laying out the
    // lyrics, queue, artwork and controls again on every animation frame.
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    const duration = reduced ? 0 : expand ? 600 : 660
    const easing = expand ? OPEN_EASE : CLOSE_EASE
    const extraAnimations: Animation[] = []
    const miniFrame = mini?.querySelector<HTMLElement>('.sona-player-cover')
    const miniArt = miniFrame?.querySelector<HTMLImageElement>('img')
    const fullArt = sheet.querySelector<HTMLElement>('.sona-now-art')
    const fullImage = fullArt?.querySelector<HTMLImageElement>('img')
    const oldFullVisibility = fullArt?.style.visibility || ''
    const oldMiniVisibility = miniArt?.style.visibility || ''
    const sourceImage = [expand ? miniArt : fullImage, miniArt, fullImage].find(
      (image) => image && image.naturalWidth > 0,
    )
    const imageSrc = sourceImage?.currentSrc || sourceImage?.src
    if (miniFrame && fullArt && !reduced) {
      const miniBounds = miniFrame.getBoundingClientRect()
      const fullBounds = fullArt.getBoundingClientRect()
      const from =
        previousCover ||
        (expand && wasClosed ? miniBounds : previousArt || fullBounds)
      const to = expand ? fullBounds : miniBounds
      const ghost = document.createElement('div')
      ghost.className = 'sona-player-artwork-flight'
      let ghostImage = imageSrc
        ? (sourceImage!.cloneNode(false) as HTMLImageElement)
        : (fullArt.querySelector('svg')?.cloneNode(true) as SVGSVGElement) ||
          document.createElement('span')
      if (!imageSrc && !(ghostImage instanceof SVGSVGElement)) {
        const svg = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'svg',
        )
        svg.setAttribute('viewBox', '0 0 512 512')
        svg.setAttribute('fill', 'currentColor')
        const path = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'path',
        )
        path.setAttribute('d', SONA_NOTE_PATH)
        svg.appendChild(path)
        ghostImage = svg
      }
      if (imageSrc) (ghostImage as HTMLImageElement).src = imageSrc
      if (imageSrc) {
        // The decoded source is already on screen. A CSS image paints from the
        // same resource while WebKit initializes the cloned <img> element.
        ghost.style.backgroundImage = `url(${JSON.stringify(imageSrc)})`
        ghost.style.backgroundSize = 'cover'
        ghost.style.backgroundPosition = 'center'
      }
      ghostImage.removeAttribute('id')
      ghostImage.removeAttribute('class')
      if (ghostImage instanceof HTMLImageElement) {
        ghostImage.loading = 'eager'
        ghostImage.decoding = 'sync'
        ghostImage.alt = ''
      } else
        Object.assign(ghost.style, {
          background: '#2c2b30',
          color: '#ddd',
          display: 'grid',
          placeItems: 'center',
        })
      Object.assign(ghostImage.style, {
        width: imageSrc ? '100%' : '44%',
        height: imageSrc ? '100%' : '44%',
        objectFit: 'cover',
        display: 'block',
      })
      ghost.appendChild(ghostImage)
      Object.assign(ghost.style, {
        width: fullBounds.width + 'px',
        height: fullBounds.height + 'px',
      })
      document.body.appendChild(ghost)
      coverGhost.current = ghost
      fullArt.style.visibility = 'hidden'
      // Keep the landing artwork visible beneath the flight; never expose a blank tile.
      const miniRadius =
        parseFloat(getComputedStyle(miniFrame).borderTopLeftRadius) || 9
      const artScale = new DOMMatrixReadOnly(
        getComputedStyle(fullArt).transform,
      ).a
      const fullRadius =
        (parseFloat(getComputedStyle(fullArt).borderTopLeftRadius) || 13) *
        artScale
      const fullShadow = getComputedStyle(fullArt).boxShadow
      const frameFor = (bounds: DOMRect, radius: number) => {
        const x = bounds.width / fullBounds.width
        const y = bounds.height / fullBounds.height
        return {
          transform: `translate3d(${bounds.left}px,${bounds.top}px,0) scale(${x},${y})`,
          borderRadius: `${radius / x}px / ${radius / y}px`,
        }
      }
      const content = fullArt.querySelector<HTMLElement>(
        '.sona-now-art-content',
      )
      const contentTransform = content
        ? getComputedStyle(content).transform
        : 'scale(1)'
      extraAnimations.push(
        ghostImage.animate(
          [
            { transform: expand ? 'scale(1)' : contentTransform },
            { transform: expand ? contentTransform : 'scale(1)' },
          ],
          { duration, easing, fill: 'both' },
        ),
      )
      extraAnimations.push(
        ghost.animate(
          [
            {
              ...frameFor(from, expand && wasClosed ? miniRadius : fullRadius),
              boxShadow: expand ? '0 2px 5px #0002' : fullShadow,
              opacity: 1,
            },
            {
              ...frameFor(to, expand ? fullRadius : miniRadius),
              boxShadow: expand ? fullShadow : '0 2px 5px #0002',
              opacity: 1,
            },
          ],
          { duration, easing, fill: 'both' },
        ),
      )
    }
    const detailFlight =
      !expand && mini && !reduced
        ? revealMiniPlayerDetails(sheet, mini)
        : null
    const panel = sheet.querySelector<HTMLElement>('.sona-now-panel')
    if (panel && !reduced) {
      extraAnimations.push(
        panel.animate(
          expand && wasClosed
            ? [
                { transform: 'translate3d(0,92px,0)', opacity: 0 },
                { transform: 'translate3d(0,0,0)', opacity: 1 },
              ]
            : expand
              ? [panelSnapshot, { transform: 'translate3d(0,0,0)', opacity: 1 }]
              : [
                  panelSnapshot,
                  { transform: 'translate3d(0,42px,0)', opacity: 0 },
                ],
          {
            duration: expand ? 570 : 40,
            delay: expand && wasClosed ? 45 : 0,
            easing: OPEN_EASE,
            fill: 'both',
          },
        ),
      )
    }
    const cleanupFlight = () => {
      detailFlight?.cleanup()
      coverGhost.current?.remove()
      coverGhost.current = null
      if (fullArt) fullArt.style.visibility = oldFullVisibility
      if (miniArt) miniArt.style.visibility = oldMiniVisibility
    }
    cleanupExtras.current = () => {
      cleanupFlight()
      extraAnimations.forEach((item) => item.cancel())
    }
    // Top and sides settle first; the bottom stays present until the last part
    // of closing. Sample independent edge curves into compositor keyframes.
    const startBounds =
      expand && wasClosed
        ? { left, top, width: sx * width, height: sy * height }
        : visualBounds
    const endBounds = expand
      ? { left: 0, top: 0, width, height }
      : { left, top, width: sx * width, height: sy * height }
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t
    const startRadius = expand && wasClosed ? radius : visualCorner
    const frames = Array.from({ length: 41 }, (_, index) => {
      const t = index / 40
      const edge = 1 - Math.pow(1 - t, expand ? 3 : 4)
      const bottomProgress = expand
        ? 1 - Math.pow(1 - t, 6)
        : 1 - Math.pow(1 - Math.min(1, Math.max(0, (t * duration - 73) / 467)), 1.8)
      const x = lerp(startBounds.left, endBounds.left, edge)
      const y = lerp(startBounds.top, endBounds.top, edge)
      const w = lerp(startBounds.width, endBounds.width, edge)
      const bottom = lerp(
        startBounds.top + startBounds.height,
        endBounds.top + endBounds.height,
        bottomProgress,
      )
      const h = Math.max(1, bottom - y)
      const corner = lerp(startRadius, expand ? 0 : radius, edge)
      return {
        offset: t,
        transform: `translate3d(${x}px,${y}px,0) scale(${w / width},${h / height})`,
        borderRadius: `${corner / (w / width)}px / ${corner / (h / height)}px`,
        opacity: 1,
      }
    })
    const background = sheet.querySelector<HTMLElement>('.sona-now-background')
    const glass = sheet.querySelector<HTMLElement>('.sona-now-glass')
    const glassOpacity = expand && wasClosed ? 1 : glass ? Number(getComputedStyle(glass).opacity) : 0
    const backgroundOpacity = background ? Number(getComputedStyle(background).opacity) : 1
    for (const surface of [background, content, glass]) {
      if (!surface) continue
      extraAnimations.push(
        surface.animate(
          frames.map((frame) => {
            const matrix = new DOMMatrixReadOnly(frame.transform)
            return {
              offset: frame.offset,
              scale: `${1 / matrix.a} ${1 / matrix.d}`,
              ...(surface === glass
                ? {
                    opacity: expand
                      ? lerp(glassOpacity, 0, Math.min(1, frame.offset / .22))
                      : lerp(glassOpacity, 1, Math.min(1, frame.offset / .5)),
                  }
                : surface === background ? { opacity: expand ? Math.min(1, frame.offset / .22) : lerp(backgroundOpacity, 0, Math.min(1, frame.offset / .5)) } : {}),
            }
          }),
          { duration, easing: 'linear', fill: 'both' },
        ),
      )
    }
    const capsule = sheet.querySelector<HTMLElement>('.sona-now-top')
    if (capsule && !expand)
      extraAnimations.push(
        capsule.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: 0,
          fill: 'both',
        }),
      )
    const anim = sheet.animate(frames, {
      duration,
      easing: 'linear',
      fill: 'both',
    })
    animation.current = anim
    const finish = () => {
      if (animation.current !== anim) return
      Object.assign(sheet.style, expand ? full : compact)
      if (background && expand) {
        background.style.scale = '1'
        background.style.opacity = '1'
      }
      if (glass) { glass.style.scale = '1'; glass.style.opacity = expand ? '0' : '1' }
      if (content && expand) content.style.scale = '1'
      cleanupFlight()
      sheet.dataset.phase = expand ? 'open' : 'closed'
      animation.current = null
      anim.cancel()
      distance.current = 0
      if (!expand) {
        delete document.documentElement.dataset.sonaPlayerSettling
        if (reduced) document.documentElement.dataset.sonaPlayerProgress = 'returning'
        onClosedRef.current?.()
      }
    }
    anim.finished
      .then(() => {
        if (animation.current !== anim) return
        if (expand || reduced) {
          finish()
          return
        }
        // Fade only after the sheet, artwork, title and play icon share mini bounds.
        sheet.dataset.phase = 'landing'
        if (miniArt) miniArt.style.visibility = oldMiniVisibility
        document.documentElement.dataset.sonaPlayerProgress = 'returning'
        const landing = [
          sheet,
          ...(coverGhost.current ? [coverGhost.current] : []),
          ...(detailFlight?.nodes ?? []),
        ]
        const fades = landing.map((node) =>
          node.animate([{ opacity: getComputedStyle(node).opacity }, { opacity: 0 }], {
            duration: 1000,
            easing: 'ease-out',
            fill: 'both',
          }),
        )
        extraAnimations.push(...fades)
        Promise.all(fades.map((fade) => fade.finished))
          .then(finish)
          .catch(() => {})
      })
      .catch(() => {})
  }

  useLayoutEffect(() => {
    if (!open && !initialized.current) {
      if (ref.current) ref.current.dataset.phase = 'closed'
    } else run(open)
    initialized.current = true
  }, [open])

  useLayoutEffect(
    () => () => {
      cancelAnimationFrame(frame.current)
      animation.current?.cancel()
      cleanupExtras.current()
      delete document.documentElement.dataset.sonaPlayerSettling
      initialized.current = false
      if (ref.current) ref.current.dataset.phase = 'closed'
    },
    [],
  )

  function begin() {
    const sheet = ref.current
    if (!sheet) return
    // Never let a downward gesture interrupt opening/settling animations.
    // The sheet is only draggable once its opening transition has fully landed.
    if (sheet.dataset.phase !== 'open' || animation.current) return false
    lastCorners.current = ''
    const rect = sheet.getBoundingClientRect()
    const matrix = new DOMMatrixReadOnly(getComputedStyle(sheet).transform)
    dragShape.current = {
      x: matrix.e,
      height: sheet.offsetHeight,
      sx: Math.max(0.01, matrix.a),
      sy: Math.max(0.01, matrix.d),
    }
    // No running animation here: the opening/closing phase was rejected above.
    animation.current = null
    cleanupExtras.current()
    distance.current = Math.max(0, rect.top)
    const background = sheet.querySelector<HTMLElement>('.sona-now-background')
    dragBackground.current = background
    if (background)
      background.style.scale = `${1 / dragShape.current.sx} ${1 / dragShape.current.sy}`
    const content = sheet.querySelector<HTMLElement>('.sona-now-content')
    if (content)
      content.style.scale = `${1 / dragShape.current.sx} ${1 / dragShape.current.sy}`
    sheet.style.opacity = '1'
    sheet.classList.add('is-dragging')
    sheet.dataset.phase = 'dragging'
    return true
  }

  return { ref, move, flush, begin, settle: () => run(true), distance }
}
