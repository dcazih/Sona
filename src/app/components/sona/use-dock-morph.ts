import { useLayoutEffect, useRef } from 'react'

type State = {
  mode: 'normal' | 'compact' | 'search'
  editing: boolean
  results?: boolean
  focused: boolean
  moving: boolean
}
export const DOCK_DURATION = 440
// Sample cubic curves once per interaction. The browser owns the animation frames.
export function dockCubic(
  t: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) {
  const curve = (p: number, a: number, b: number) =>
    3 * (1 - p) ** 2 * p * a + 3 * (1 - p) * p * p * b + p ** 3
  let low = 0,
    high = 1
  for (let i = 0; i < 18; i++) {
    const p = (low + high) / 2
    if (curve(p, x1, x2) < t) low = p
    else high = p
  }
  return t === 0 ? 0 : t === 1 ? 1 : curve((low + high) / 2, y1, y2)
}
const geometry = (element: HTMLElement) => {
  const css = getComputedStyle(element)
  return {
    left: parseFloat(css.left),
    bottom: parseFloat(css.bottom),
    width: parseFloat(css.width),
    height: parseFloat(css.height),
  }
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const smooth = (t: number) => t * t * (3 - 2 * t)
/** Persistent shells morph on one uninterrupted timeline; fixed-size contents are clipped, never compressed. */
export function useDockMorph({
  mode,
  editing,
  results = false,
  focused,
  moving,
}: State) {
  const animations = useRef<Animation[]>([]),
    previous = useRef('')
  useLayoutEffect(() => {
    const root = document.documentElement,
      key = mode + ':' + (results ? 'results' : editing ? 'editing' : 'browse')
    const surfaces = [
      ...document.querySelectorAll<HTMLElement>(
        '.sona-bottom-nav-split,.sona-search-morph,.sona-player[data-mobile-active="true"]',
      ),
    ]
    const from = surfaces.map(geometry)
    const interrupted = animations.current.some(
      (a) => a.playState === 'running',
    )
    const previousMode = previous.current.split(':')[0]
    animations.current.forEach((a) => a.cancel())
    animations.current = []
    root.dataset.sonaDockReady = 'true'
    root.dataset.sonaDock = mode
    root.dataset.sonaSearchMode = results
      ? 'results'
      : editing
        ? 'editing'
        : 'browse'
    root.dataset.sonaSearchFocused = String(focused)
    root.dataset.sonaKeyboardMoving = String(moving)
    const to = surfaces.map(geometry)
    if (
      previous.current &&
      previous.current !== key &&
      !focused &&
      !moving &&
      window.innerWidth < 768 &&
      !matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      const start = document.timeline.currentTime
      animations.current = surfaces.flatMap((element, index) => {
        const a = from[index],
          b = to[index]
        if (!(a.width > 0 && b.width > 0)) return []
        const mini = element.matches('.sona-player')
        const expanding =
          previousMode === 'compact' && mode !== 'compact' && !interrupted
        const collapsing =
          mode === 'compact' && previousMode !== 'compact' && !interrupted
        const frames = Array.from({ length: 61 }, (_, i) => {
          const t = i / 60
          let p = dockCubic(t, 0.22, 0.8, 0.22, 1),
            vertical = p,
            width = lerp(a.width, b.width, p)
          if (expanding) {
            if (mini) {
              vertical = dockCubic(t, 0.06, 1, 0.14, 1)
              const q = Math.max(0, (vertical - 0.6) / 0.4) ** 4
              // Begin widening at 60% of the rise; a 2px crest settles before the motion ends.
              width =
                q <= 0.85
                  ? lerp(a.width, b.width + 2, smooth(q / 0.85))
                  : lerp(b.width + 2, b.width, smooth((q - 0.85) / 0.15))
              p = (width - a.width) / Math.max(1, b.width - a.width)
            } else {
              p = dockCubic(t, 0.55, 0, 0.2, 1)
              vertical = p
              width = lerp(a.width, b.width, p)
            }
          } else if (collapsing && mini) {
            vertical = dockCubic(t, 0.75, 0, 0.55, 1)
          }
          return {
            offset: t,
            left: lerp(a.left, b.left, p) + 'px',
            bottom: lerp(a.bottom, b.bottom, vertical) + 'px',
            width: width + 'px',
            height: lerp(a.height, b.height, p) + 'px',
          }
        })
        const animation = element.animate(frames, {
          duration: DOCK_DURATION,
          easing: 'linear',
        })
        animation.startTime = start
        return [animation]
      })
    }
    previous.current = key
  }, [mode, editing, results, focused, moving])
  useLayoutEffect(
    () => () => {
      animations.current.forEach((a) => a.cancel())
      for (const key of [
        'sonaDockReady',
        'sonaDock',
        'sonaSearchMode',
        'sonaSearchFocused',
        'sonaKeyboardMoving',
      ])
        delete document.documentElement.dataset[key]
    },
    [],
  )
}
