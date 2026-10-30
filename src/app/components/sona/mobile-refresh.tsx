import { useQueryClient } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { getMainScrollElement } from '@/utils/scrollPageToTop'
import { useSonaRefresh } from './refresh-state'

const THRESHOLD = 72
const MAX_PULL = 108

/** Refresh active queries without navigating or interrupting the audio player. */
export function SonaPullToRefresh() {
  const queryClient = useQueryClient()
  const { pathname } = useLocation()
  const { refreshing, setRefreshing } = useSonaRefresh()
  const [pull, setPull] = useState(0)
  const pullRef = useRef(0)
  const busy = useRef(false)
  const [lastResult, setLastResult] = useState('')

  const refresh = useCallback(async () => {
    if (busy.current) return
    busy.current = true
    pullRef.current = 0
    setPull(0)
    setRefreshing(true)
    setLastResult('')
    try {
      await queryClient.invalidateQueries({ refetchType: 'active' })
      setLastResult('Updated')
    } catch {
      setLastResult('Refresh failed')
    } finally {
      busy.current = false
      setRefreshing(false)
    }
  }, [queryClient, setRefreshing])

  useEffect(() => {
    const viewport = getMainScrollElement()
    if (!viewport) return
    let start: {x: number;y: number} | null = null

    function touchStart(event: TouchEvent) {
      if (event.touches.length !== 1 || window.innerWidth >= 768 ||
          busy.current || !viewport || viewport.scrollTop > 1 ||
          (event.target as Element).closest('input, textarea, select, [contenteditable], [role="slider"], .sona-search-dock')) {
        start = null
        return
      }
      start = { x: event.touches[0].clientX, y: event.touches[0].clientY }
    }

    function touchMove(event: TouchEvent) {
      if (!start || !viewport) return
      const dx = event.touches[0].clientX - start.x
      const dy = event.touches[0].clientY - start.y
      if (dy < 0 || Math.abs(dx) > dy * 0.8 || viewport.scrollTop > 1) {
        start = null
        pullRef.current = 0
        setPull(0)
        return
      }
      if (dy > 5) {
        if (event.cancelable) event.preventDefault()
        pullRef.current = Math.min(MAX_PULL, dy * 0.57)
        setPull(pullRef.current)
      }
    }

    function touchEnd() {
      if (pullRef.current >= THRESHOLD && !busy.current) void refresh()
      else setPull(0)
      pullRef.current = 0
      start = null
    }

    const handleRequest = () => { void refresh() }
    viewport.addEventListener('touchstart', touchStart, { passive: true })
    viewport.addEventListener('touchmove', touchMove, { passive: false })
    viewport.addEventListener('touchend', touchEnd, { passive: true })
    viewport.addEventListener('touchcancel', touchEnd, { passive: true })
    window.addEventListener('sona:refresh', handleRequest)
    return () => {
      viewport.removeEventListener('touchstart', touchStart)
      viewport.removeEventListener('touchmove', touchMove)
      viewport.removeEventListener('touchend', touchEnd)
      viewport.removeEventListener('touchcancel', touchEnd)
      window.removeEventListener('sona:refresh', handleRequest)
    }
  }, [pathname, refresh])

  return (
    <div className={'sona-pull-refresh ' + (refreshing ? 'is-refreshing' : '')}
      data-visible={pull > 6 || refreshing}
      style={{ '--sona-pull-distance': String(pull) + 'px' } as React.CSSProperties}
      role="status" aria-live="polite"
      aria-label={refreshing ? 'Refreshing music library' : lastResult || 'Pull down to refresh'}>
      <span className="sona-pull-refresh-pill">
        <RefreshCw size={18} strokeWidth={2.2} />
        {refreshing ? 'Refreshing…' : pull >= THRESHOLD ? 'Release to refresh' : 'Pull to refresh'}
      </span>
    </div>
  )
}

/** A visible manual refresh stays inside the fixed glass header on mobile. */
export function SonaRefreshButton() {
  const refreshing = useSonaRefresh((state) => state.refreshing)
  return (
    <button type="button" className="sona-refresh-button"
      disabled={refreshing}
      aria-label="Refresh music library"
      title="Refresh music library"
      onClick={() => window.dispatchEvent(new Event('sona:refresh'))}>
      <RefreshCw size={19} className={refreshing ? 'animate-spin' : undefined} strokeWidth={1.9}/>
    </button>
  )
}
