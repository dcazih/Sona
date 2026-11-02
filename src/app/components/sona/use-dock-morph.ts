import { getDockBounds } from './dock-bounds'
import { useLayoutEffect, useRef } from 'react'

type State = {
  mode: 'normal' | 'compact' | 'search'
  editing: boolean
  results?: boolean
  focused: boolean
  moving: boolean
}
export const DOCK_DURATION = 260
const geometry = (element: HTMLElement) => {
  const box = getDockBounds(element)
  return {
    left: box.left,
    bottom: box.bottom,
    width: box.width,
    height: box.height,
    top: box.top,
    baseWidth: element.offsetWidth,
    orbX: (() => {
      const orb = element.querySelector('.sona-search-orb')
      return orb ? new DOMMatrixReadOnly(getComputedStyle(orb).transform).m41 : 0
    })(),
    translateY:
      parseFloat(getComputedStyle(element).translate.split(/\s+/)[1]) || 0,
  }
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
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
    root.dataset.sonaSearchFocused = String(focused)
    root.dataset.sonaKeyboardMoving = String(moving)
    // Viewport/keyboard updates must not cancel a geometry transition in flight.
    if (previous.current === key && root.dataset.sonaDockReady === 'true') return
    const surfaces = [
      ...document.querySelectorAll<HTMLElement>(
        '.sona-bottom-nav-split,.sona-search-morph,.sona-player[data-mobile-active="true"]',
      ),
    ]
    const from = surfaces.map(geometry)
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
    surfaces.forEach((element, index) => setSurfaceRest(element, to[index]))
    if (
      previous.current &&
      previous.current !== key &&
      !focused &&
      !moving &&
      window.innerWidth < 768
    ) {
      const start = document.timeline.currentTime
      animations.current = surfaces.flatMap((element, index) => {
        const a = from[index],
          b = to[index]
        if (!(a.width > 0 && b.width > 0)) return []
        const mini = element.matches('.sona-player'),
          search = element.matches('.sona-search-morph')
        const expanding =
          previousMode === 'compact' && mode !== 'compact' && (!mini || a.top > b.top)
        const collapsing =
          mode === 'compact' && previousMode !== 'compact'
        return animateSurface(
          element,
          a,
          b,
          start,
          DOCK_DURATION,
          mini,
          search,
          expanding,
          collapsing,
        )
      })
    }
    previous.current = key
  }, [mode, editing, results, focused, moving])
  useLayoutEffect(
    () => () => {
      animations.current.forEach((a) => a.cancel())
      previous.current = ''
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

type Box = ReturnType<typeof geometry>
function parts(element: HTMLElement) {
  return {
    shadow: element.querySelector<HTMLElement>(':scope>.sona-dock-shadow'),
    surface: element,
    contents: element.querySelector<HTMLElement>(
      ':scope>.sona-dock-surface>.sona-dock-contents',
    ),
    left: element.querySelector<SVGElement>('.sona-dock-rim-left'),
    right: element.querySelector<SVGElement>('.sona-dock-rim-right'),
    top: element.querySelector<HTMLElement>('.sona-dock-rim-top'),
    bottom: element.querySelector<HTMLElement>('.sona-dock-rim-bottom'),
    controls: element.matches('.sona-player')
      ? element.querySelector<HTMLElement>(
          '.sona-player-controls>div:first-child',
        )
      : null,
    progress: element.matches('.sona-player')
      ? element.querySelector<HTMLElement>('.sona-web-player-progress')
      : null,
    voice: element.matches('.sona-search-morph')
      ? element.querySelector<HTMLElement>('.sona-search-inline-action')
      : null,
  }
}
function rimTransforms(width: number, height: number, base: number) {
  return {
    left: `scale(${height / 64})`,
    right: `translate3d(${width - height}px,0,0) scale(${height / 64})`,
    top: `translate3d(${height / 2}px,0,0) scaleX(${Math.max(0, width - height) / base})`,
    bottom: `translate3d(${height / 2}px,${height - 1}px,0) scaleX(${Math.max(0, width - height) / base})`,
  }
}
function setSurfaceRest(element: HTMLElement, box: Box) {
  const p = parts(element),
    base = box.baseWidth,
    rim = rimTransforms(box.width, box.height, base)
  if (p.shadow) {
    p.shadow.style.transform = `scale(${box.width / base},${box.height / 64})`
    p.shadow.style.borderRadius = `${box.height / 2 / (box.width / base)}px / 32px`
  }
  for (const key of ['left', 'right', 'top', 'bottom'] as const)
    if (p[key]) p[key]!.style.transform = rim[key]
  if (p.controls)
    p.controls.style.transform = `translate3d(${box.width - base}px,0,0)`
  if (p.progress) {
    p.progress.style.transformOrigin = '0 50%'
    p.progress.style.transform = `scaleX(${(box.width - 24) / (base - 24)})`
  }
  if (p.voice) p.voice.style.transform = `translate3d(${box.width - base}px,0,0)`

}

function animateSurface(
  element: HTMLElement,
  from: Box,
  target: Box,
  start: CSSNumberish | null,
  duration: number,
  mini: boolean,
  search: boolean,
  expanding: boolean,
  collapsing: boolean,
) {
  const p = parts(element),
    base = target.baseWidth,
    result: Animation[] = []
  const standard = 'cubic-bezier(.16,1,.3,1)',
    widthEase = standard
  type Stop = { offset: number; fraction: number; easing?: string }
  const widthStops: Stop[] =
    expanding && mini
      ? [
          { offset: 0, fraction: 0, easing: 'linear' },
          { offset: 0.17, fraction: 0, easing: 'cubic-bezier(.4,0,.2,1)' },
          {
            offset: 0.78,
            fraction: 1 + 2 / Math.max(1, target.width - from.width),
            easing: 'cubic-bezier(.4,0,.2,1)',
          },
          { offset: 1, fraction: 1 },
        ]
      : [
          { offset: 0, fraction: 0, easing: widthEase },
          { offset: 1, fraction: 1 },
        ]
  const frames = widthStops.map((stop) => ({
    ...stop,
    width: lerp(from.width, target.width, stop.fraction),
    height: lerp(from.height, target.height, stop.fraction),
  }))
  const play = (part: Element | null, keyframes: Keyframe[]) => {
    if (!part || getComputedStyle(part).display === 'none') return
    const properties = Object.keys(keyframes[0]).filter(
      (key) => key !== 'offset' && key !== 'easing',
    )
    if (
      keyframes.every((frame) =>
        properties.every(
          (key) =>
            frame[key as keyof Keyframe] ===
            keyframes[0][key as keyof Keyframe],
        ),
      )
    )
      return
    const animation = part.animate(keyframes, { duration, easing: 'linear' })
    animation.startTime = start
    result.push(animation)
  }
  const timeline = (
    map: (frame: (typeof frames)[number]) => Record<string, string>,
  ) => frames.map((f) => ({ offset: f.offset, easing: f.easing, ...map(f) }))
  // Independent compositor translations keep the delayed width growth separate from the continuous rise.
  play(
    element,
    timeline((f) => ({
      transform: `translate3d(${lerp(from.left, target.left, f.fraction)}px,0,0)`,
    })),
  )
  const targetY = target.translateY
  const fromY = targetY + from.top - target.top
  const verticalEase =
    mini && expanding
      ? 'cubic-bezier(.06,1,.14,1)'
      : mini && collapsing
        ? 'cubic-bezier(.75,0,.55,1)'
        : widthEase
  play(element, mini && expanding ? [
    { offset: 0, translate: `0px ${fromY}px`, easing: verticalEase },
    { offset: 1, translate: `0px ${targetY}px` },
  ] : [
    { offset: 0, translate: `0px ${fromY}px`, easing: 'linear' },
    { offset: .17, translate: `0px ${fromY}px`, easing: verticalEase },
    { offset: 1, translate: `0px ${targetY}px` },
  ])
  play(
      p.surface,
      timeline((f) => ({
        clipPath: `inset(0px ${base - f.width}px ${64 - f.height}px 0px round ${f.height / 2}px)`,
      })),
    )
  play(
    p.shadow,
    timeline((f) => ({
      transform: `scale(${f.width / base},${f.height / 64})`,
      borderRadius: `${f.height / 2 / (f.width / base)}px / 32px`,
    })),
  )
  if (!mini)
    play(
      p.contents,
      timeline((f) => ({
        transform: `translate3d(0,${(f.height - 64) / 2}px,0)`,
      })),
    )
  // The rim is hidden on mobile; animating four more clipped SVG surfaces
  // makes rapid tab/Search reversals hitch on iPhone.
  play(
    p.controls,
    timeline((f) => ({ transform: `translate3d(${f.width - base}px,0,0)` })),
  )
  play(
    p.progress,
    timeline((f) => ({ transform: `scaleX(${(f.width - 24) / (base - 24)})` })),
  )
  play(
    p.voice,
    timeline((f) => ({
      transform: `translate3d(${f.width - base}px,0,0)`,
    })),
  )
  if (search) {
    const oldX = from.orbX,
      newX = target.width > 64 ? 0 : (target.width - 50) / 2
    play(
      element.querySelector('.sona-search-orb'),
      timeline((f) => ({
        transform: `translate3d(${lerp(oldX, newX, f.fraction)}px,-50%,0)`,
      })),
    )
  }
  return result
}
