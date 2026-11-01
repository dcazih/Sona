import { useLayoutEffect, useRef } from 'react'

type State = {
  mode: 'normal' | 'compact' | 'search'
  editing: boolean
  focused: boolean
  moving: boolean
}
const geometry = (element: HTMLElement) => {
  const css = getComputedStyle(element)
  return {
    left: css.left,
    bottom: css.bottom,
    width: css.width,
    height: css.height,
  }
}
/** One timeline and one geometry read/write batch for all three persistent surfaces. */
export function useDockMorph({ mode, editing, focused, moving }: State) {
  const animations = useRef<Animation[]>([]),
    previous = useRef('')
  useLayoutEffect(() => {
    const root = document.documentElement,
      key = mode + ':' + editing
    const surfaces = [
      ...document.querySelectorAll<HTMLElement>(
        '.sona-bottom-nav-split,.sona-search-morph,.sona-player[data-mobile-active="true"]',
      ),
    ]
    const interrupted = animations.current.some(
      (animation) => animation.playState === 'running',
    )
    const previousMode = previous.current.split(':')[0]
    const from = surfaces.map(geometry)
    animations.current.forEach((animation) => animation.cancel())
    animations.current = []
    root.dataset.sonaDockReady = 'true'
    root.dataset.sonaDock = mode
    root.dataset.sonaSearchMode = editing ? 'editing' : 'browse'
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
        if (
          !(
            parseFloat(from[index].width) > 0 && parseFloat(to[index].width) > 0
          )
        )
          return []
        const easing = 'cubic-bezier(.22,.8,.22,1)'
        const mini = element.matches('.sona-player')
        let frames: Keyframe[] = [
          { ...from[index], offset: 0, easing },
          { ...to[index], offset: 1 },
        ]
        // Vacate the lower row before widening it; keep interrupted gestures continuous.
        if (!interrupted && previousMode === 'normal' && mode === 'compact') {
          frames = [
            { ...from[index], offset: 0, easing },
            {
              ...to[index],
              ...(mini ? { bottom: from[index].bottom } : {}),
              offset: 0.4,
              easing,
            },
            { ...to[index], offset: 1 },
          ]
        } else if (
          !interrupted &&
          previousMode === 'compact' &&
          mode !== 'compact'
        ) {
          frames = [
            { ...from[index], offset: 0, easing },
            {
              ...from[index],
              ...(mini ? { bottom: to[index].bottom } : {}),
              offset: 0.4,
              easing,
            },
            { ...to[index], offset: 1 },
          ]
        }
        const animation = element.animate(frames, { duration: 600 })
        animation.startTime = start
        return [animation]
      })
    }
    previous.current = key
  }, [mode, editing, focused, moving])
  useLayoutEffect(
    () => () => {
      animations.current.forEach((animation) => animation.cancel())
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
