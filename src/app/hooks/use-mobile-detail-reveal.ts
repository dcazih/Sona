import { useLayoutEffect, useState } from 'react'

/** Each cold entity gets its own black interval; cached data opens immediately. */
export function useMobileDetailReveal(key: string, loading: boolean) {
  const [elapsed, setElapsed] = useState<string | null>(null)
  useLayoutEffect(() => {
    setElapsed(null)
    if (!loading) return
    const timer = window.setTimeout(() => setElapsed(key), 1000)
    return () => window.clearTimeout(timer)
  }, [key, loading])
  return loading && elapsed !== key
}
