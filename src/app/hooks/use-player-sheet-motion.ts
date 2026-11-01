import { useLayoutEffect, useRef } from 'react'

const OPEN_EASE = 'cubic-bezier(.22,.8,.22,1)'
const CLOSE_EASE = 'cubic-bezier(.22,.55,.14,1)'
export const playerDragRadius = (distance: number) => 34 * (1 - Math.exp(-Math.max(0, distance) / 28))

/** One composited surface; gestures never re-render the player controls. */
export function usePlayerSheetMotion(open: boolean, onClosed?: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  const animation = useRef<Animation | null>(null)
  const frame = useRef(0)
  const coverGhost = useRef<HTMLImageElement | null>(null)
  const cleanupExtras = useRef<() => void>(() => {})
  const distance = useRef(0)
  const dragShape = useRef({ x: 0, sx: 1, sy: 1 })
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
    const radius = playerDragRadius(distance.current)
    sheet.style.borderRadius = `${radius / sx}px ${radius / sx}px 0 0 / ${radius / sy}px ${radius / sy}px 0 0`
    sheet.style.opacity = '1'
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
    const previousPanel = sheet.querySelector<HTMLElement>('.sona-now-panel')
    const panelSnapshot = previousPanel ? {
      transform: getComputedStyle(previousPanel).transform,
      opacity: getComputedStyle(previousPanel).opacity,
    } : { transform: 'translate3d(0,0,0)', opacity: '1' }
    cleanupExtras.current()
    const mini = document.querySelector<HTMLElement>('.sona-player[data-mobile-active="true"]')
    const target = mini?.getBoundingClientRect()
    const width = sheet.offsetWidth
    const height = sheet.offsetHeight
    if (!width || !height) return
    const sx = Math.max(.01, (mini?.offsetWidth || width - 24) / width)
    const sy = Math.max(.01, (mini?.offsetHeight || 50) / height)
    const radius = (mini?.offsetHeight || 50) / 2
    const left = target && mini ? target.left + (target.width - mini.offsetWidth) / 2 : 12
    const top = target && mini ? target.top + (target.height - mini.offsetHeight) / 2 : height - 110
    const compact = {
      transform: `translate3d(${left}px,${top}px,0) scale(${sx},${sy})`,
      borderRadius: `${radius / sx}px / ${radius / sy}px`, opacity: '0',
    }
    const full = { transform: 'translate3d(0,0,0) scale(1,1)', borderRadius: '0px', opacity: '1' }
    const computed = getComputedStyle(sheet)
    const current = { transform: computed.transform, borderRadius: computed.borderRadius, opacity: computed.opacity }
    const wasClosed = !sheet.dataset.phase || sheet.dataset.phase === 'closed'
    animation.current?.cancel()
    sheet.dataset.phase = expand ? 'opening' : 'closing'
    sheet.classList.remove('is-dragging')
    // FLIP: visual width and height change via scale, without laying out the
    // lyrics, queue, artwork and controls again on every animation frame.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const duration = reduced ? 0 : expand ? 540 : 780
    const easing = expand ? OPEN_EASE : CLOSE_EASE
    const extraAnimations: Animation[] = []
    let reboundTimer = 0
    let rebound: Animation | undefined
    const miniArt = mini?.querySelector<HTMLImageElement>('.sona-player-cover img')
    const fullArt = sheet.querySelector<HTMLElement>('.sona-now-art')
    const fullImage = fullArt?.querySelector<HTMLImageElement>('img')
    const oldFullVisibility = fullArt?.style.visibility || ''
    const oldMiniVisibility = miniArt?.style.visibility || ''
    const sourceImage = (expand ? miniArt : fullImage) || miniArt || fullImage
    const imageSrc = sourceImage?.currentSrc || sourceImage?.src
    if (miniArt && fullArt && imageSrc && !reduced) {
      const miniBounds = miniArt.getBoundingClientRect()
      const artBounds = fullArt.getBoundingClientRect()
      const matrix = new DOMMatrixReadOnly(computed.transform)
      const fullBounds = new DOMRect(
        (artBounds.left - matrix.e) / Math.max(.01, matrix.a),
        (artBounds.top - matrix.f) / Math.max(.01, matrix.d),
        artBounds.width / Math.max(.01, matrix.a), artBounds.height / Math.max(.01, matrix.d))
      const from = previousCover || (expand && wasClosed ? miniBounds : artBounds)
      const to = expand ? fullBounds : miniBounds
      const ghost = document.createElement('img')
      ghost.src = imageSrc
      ghost.alt = ''
      ghost.className = 'sona-player-artwork-flight'
      Object.assign(ghost.style, { width: fullBounds.width + 'px', height: fullBounds.height + 'px' })
      document.body.appendChild(ghost)
      coverGhost.current = ghost
      fullArt.style.visibility = 'hidden'
      miniArt.style.visibility = 'hidden'
      const frameFor = (bounds: DOMRect, radius: number) => {
        const x = bounds.width / fullBounds.width
        const y = bounds.height / fullBounds.height
        return { transform: `translate3d(${bounds.left}px,${bounds.top}px,0) scale(${x},${y})`,
          borderRadius: `${radius / x}px / ${radius / y}px` }
      }
      extraAnimations.push(ghost.animate([
        { ...frameFor(from, expand && wasClosed ? 9 : 13), opacity: 1 },
        { ...frameFor(to, expand ? 13 : 9), opacity: 1 },
      ], { duration, easing, fill: 'both' }))
    }
    const panel = sheet.querySelector<HTMLElement>('.sona-now-panel')
    if (panel && !reduced) {
      extraAnimations.push(panel.animate(expand && wasClosed ? [
        { transform: 'translate3d(0,92px,0)', opacity: 0 },
        { transform: 'translate3d(0,0,0)', opacity: 1 },
      ] : expand ? [
        panelSnapshot,
        { transform: 'translate3d(0,0,0)', opacity: 1 },
      ] : [
        panelSnapshot,
        { transform: 'translate3d(0,42px,0)', opacity: 0 },
      ], { duration: expand ? 570 : 330, delay: expand && wasClosed ? 45 : 0,
        easing: OPEN_EASE, fill: 'both' }))
    }
    if (!expand && mini && !reduced) {
      reboundTimer = window.setTimeout(() => {
        mini.dataset.sonaRebound = 'true'
        rebound = mini.animate([
          { translate: '0 0', scale: '1' },
          { translate: '0 3px', scale: '1.012', offset: .35 },
          { translate: '0 -1px', scale: '.997', offset: .72 },
          { translate: '0 0', scale: '1' },
        ], { duration: 380, easing: 'cubic-bezier(.22,.75,.25,1)' })
        rebound.finished.then(() => { delete mini.dataset.sonaRebound }).catch(() => {})
      }, duration * .72)
    }
    const cleanupFlight = () => {
      coverGhost.current?.remove()
      coverGhost.current = null
      if (fullArt) fullArt.style.visibility = oldFullVisibility
      if (miniArt) miniArt.style.visibility = oldMiniVisibility
    }
    cleanupExtras.current = () => {
      cleanupFlight()
      extraAnimations.forEach(item => item.cancel())
      window.clearTimeout(reboundTimer)
      rebound?.cancel()
      if (mini) delete mini.dataset.sonaRebound
    }
    const anim = sheet.animate([expand && wasClosed ? compact : current, expand ? full : compact], {
      duration, easing, fill: 'both',
    })
    animation.current = anim
    const finish = () => {
      if (animation.current !== anim) return
      Object.assign(sheet.style, expand ? full : compact)
      cleanupFlight()
      sheet.dataset.phase = expand ? 'open' : 'closed'
      animation.current = null
      anim.cancel()
      distance.current = 0
      if (!expand) onClosedRef.current?.()
    }
    anim.finished.then(finish).catch(() => {})
  }

  useLayoutEffect(() => {
    if (!open && !initialized.current) {
      if (ref.current) ref.current.dataset.phase = 'closed'
    } else run(open)
    initialized.current = true
  }, [open])

  useLayoutEffect(() => () => {
    cancelAnimationFrame(frame.current)
    animation.current?.cancel()
    cleanupExtras.current()
    initialized.current = false
    if (ref.current) ref.current.dataset.phase = 'closed'
  }, [])

  function begin() {
    const sheet = ref.current
    if (!sheet) return
    // A grab can interrupt an opening/snap-back animation. Preserve its
    // current visual position instead of jumping to the old target.
    const rect = sheet.getBoundingClientRect()
    const matrix = new DOMMatrixReadOnly(getComputedStyle(sheet).transform)
    dragShape.current = { x: matrix.e, sx: Math.max(.01, matrix.a), sy: Math.max(.01, matrix.d) }
    animation.current?.cancel()
    animation.current = null
    cleanupExtras.current()
    distance.current = Math.max(0, rect.top)
    sheet.classList.add('is-dragging')
    sheet.dataset.phase = 'dragging'
  }

  return { ref, move, flush, begin, settle: () => run(true), distance }
}
