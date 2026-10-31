import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { getMainScrollElement } from '@/utils/scrollPageToTop'

/**
 * No visible refresh UI. Revalidate active music queries on return to the app
 * and after a deliberate long overscroll, without interrupting playback.
 * Native haptics are requested only where the browser exposes vibration.
 */
export function SonaImplicitRefresh() {
  const queryClient = useQueryClient()
  const { pathname } = useLocation()
  const lastRefresh = useRef(0)
  const busy = useRef(false)

  const refresh = useCallback(async () => {
    if (busy.current || Date.now() - lastRefresh.current < 12000) return
    busy.current = true
    lastRefresh.current = Date.now()
    try {
      await queryClient.invalidateQueries({ refetchType: 'active' })
    } finally {
      busy.current = false
    }
  }, [queryClient])

  useEffect(() => {
    if (window.innerWidth >= 768) return
    const viewport = getMainScrollElement()
    if (!viewport) return

    let start: { x: number; y: number } | null = null
    let thresholdReached = false

    function startTouch(event: TouchEvent) {
      if (event.touches.length !== 1 || viewport.scrollTop > 1 ||
        (event.target as Element).closest(
          'input, textarea, select, [contenteditable], [role="slider"], .sona-search-dock, .sona-music-rail'
        )) {
        start = null
        return
      }
      start = { x: event.touches[0].clientX, y: event.touches[0].clientY }
      thresholdReached = false
    }

    function moveTouch(event: TouchEvent) {
      if (!start) return
      const dy = event.touches[0].clientY - start.y
      const dx = event.touches[0].clientX - start.x
      if (viewport.scrollTop > 1 || dy < 0 || Math.abs(dx) > Math.max(dy, 1) * .7) {
        start = null
        return
      }
      if (dy > 125 && !thresholdReached) {
        thresholdReached = true
        // Safari on iPhone does not currently expose Vibration API.
        // Allow any supported browser to provide subtle feedback.
        if ('vibrate' in navigator) navigator.vibrate(12)
      }
      // Do not preventDefault: retain native rubber-band scrolling.
    }

    function endTouch() {
      if (thresholdReached) void refresh()
      start = null
      thresholdReached = false
    }
    function onVisibility() {
      if (document.visibilityState === 'visible') void refresh()
    }
    function onFocus() { void refresh() }

    viewport.addEventListener('touchstart', startTouch, { passive: true })
    viewport.addEventListener('touchmove', moveTouch, { passive: true })
    viewport.addEventListener('touchend', endTouch, { passive: true })
    viewport.addEventListener('touchcancel', endTouch, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', onFocus)
    return () => {
      viewport.removeEventListener('touchstart', startTouch)
      viewport.removeEventListener('touchmove', moveTouch)
      viewport.removeEventListener('touchend', endTouch)
      viewport.removeEventListener('touchcancel', endTouch)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', onFocus)
    }
  }, [pathname, refresh])

  return null
}
