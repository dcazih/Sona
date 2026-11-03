import { useLocation } from 'react-router-dom'
import { subsonic } from '@/service/subsonic'
import { invalidateLibrary } from './library-live'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef } from 'react'

/**
 * Refresh only expired active queries when returning to Sona without any pull/overscroll
 * gesture. Individual queries still revalidate using React Query policies.
 * No touch listeners or gesture-triggered fetches are installed.
 */
export function SonaImplicitRefresh() {
  const queryClient = useQueryClient()
  const { pathname } = useLocation()
  const scanSignature = useRef<string | null>(null)
  const lastRefresh = useRef(0)
  const inFlight = useRef(false)
  const revalidate = useCallback(async () => {
    if (inFlight.current || Date.now() - lastRefresh.current < 60000) return
    inFlight.current = true
    lastRefresh.current = Date.now()
    try {
      await queryClient.refetchQueries({ type: 'active', stale: true })
    } finally {
      inFlight.current = false
    }
  }, [queryClient])
  useEffect(() => {
    let cancelled = false
    const check = async () => {
      if (document.visibilityState === 'hidden') return
      try {
        const scan = await subsonic.library.getScanStatus()
        if (!scan || cancelled) return
        const signature = JSON.stringify([scan.count,scan.folderCount,scan.lastScan,scan.scanning])
        if (scanSignature.current !== signature) await invalidateLibrary(queryClient)
        scanSignature.current = signature
      } catch { /* Preserve already loaded content during connection loss. */ }
    }
    void check()
    const interval = window.setInterval(check,10000)
    const imported = () => { void invalidateLibrary(queryClient); void check() }
    window.addEventListener('sona:requests-changed',imported)
    return () => {cancelled=true;clearInterval(interval);window.removeEventListener('sona:requests-changed',imported)}
  },[queryClient])
  useEffect(() => { if(pathname === '/mobile-library' || pathname.startsWith('/library/')) void revalidate() },[pathname,revalidate])
  useEffect(() => {
    if (window.innerWidth >= 768) return
    const onVisible = () => {
      if (document.visibilityState === 'visible') void revalidate()
    }
    const onFocus = () => {
      if (document.visibilityState === 'visible') void revalidate()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onFocus)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onFocus)
    }
  }, [revalidate])
  return null
}
