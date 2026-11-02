import { useEffect, useRef, useState } from 'react'

/** A cold detail route stays black briefly; ready data is never delayed. */
export function useMobileDetailReveal(key: string, loading: boolean) {
  const [blackDone, setBlackDone] = useState(false)
  const initialKey = useRef(key)
  const initiallyLoading = useRef(loading)
  useEffect(() => {
    if (!initiallyLoading.current) return
    const timer = window.setTimeout(() => setBlackDone(true), 3000)
    return () => window.clearTimeout(timer)
  }, [])
  return loading && initiallyLoading.current && !blackDone && initialKey.current === key
}
