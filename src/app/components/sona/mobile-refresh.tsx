import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef } from 'react'

/**
 * Keep active data fresh when returning to Sona without any pull/overscroll
 * gesture. Individual queries still revalidate using React Query policies.
 * No touch listeners or gesture-triggered fetches are installed.
 */
export function SonaImplicitRefresh() {
  const queryClient = useQueryClient()
  const lastRefresh = useRef(0)
  const inFlight = useRef(false)
  const revalidate = useCallback(async () => {
    if (inFlight.current || Date.now() - lastRefresh.current < 12000) return
    inFlight.current = true
    lastRefresh.current = Date.now()
    try {
      await queryClient.invalidateQueries({ refetchType: 'active' })
    } finally {
      inFlight.current = false
    }
  }, [queryClient])
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
