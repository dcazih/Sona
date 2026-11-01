import { useLayoutEffect, useRef } from 'react'

const EASE = 'cubic-bezier(.18,.85,.2,1)'
export const playerDragRadius = (distance: number) => 34 * (1 - Math.exp(-Math.max(0, distance) / 28))

/** One composited surface; gestures never re-render the player controls. */
export function usePlayerSheetMotion(open: boolean, onClosed?: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  const animation = useRef<Animation | null>(null)
  const frame = useRef(0)
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
    const anim = sheet.animate([expand && wasClosed ? compact : current, expand ? full : compact], {
      duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 360,
      easing: EASE, fill: 'both',
    })
    animation.current = anim
    const finish = () => {
      if (animation.current !== anim) return
      Object.assign(sheet.style, expand ? full : compact)
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
    distance.current = Math.max(0, rect.top)
    sheet.classList.add('is-dragging')
    sheet.dataset.phase = 'dragging'
  }

  return { ref, move, flush, begin, settle: () => run(true), distance }
}
