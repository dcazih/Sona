import { dehydrate, hydrate, QueryClient } from '@tanstack/react-query'

const CACHE_KEY = 'sona-query-cache-v3'
const CACHE_MAX_AGE = 24 * 60 * 60 * 1000

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      staleTime: 10 * 60 * 1000,
      gcTime: CACHE_MAX_AGE,
      retry: 2,
    },
  },
})

if (typeof window !== 'undefined') {
  try {
    const stored = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
    if (stored?.savedAt && Date.now() - stored.savedAt < CACHE_MAX_AGE) {
      hydrate(queryClient, stored.state)
    }
  } catch { /* storage can be unavailable in private browsing */ }

  let saveTimer = 0
  let idleSave = 0
  const save = () => {
    // Serializing the persistent cache is main-thread work. Never let it
    // interrupt a cover morph, player animation, or an active sheet drag.
    if (document.documentElement.dataset.sonaAlbumMorph || document.querySelector(
      '.sona-now-overlay[data-phase="opening"], .sona-now-overlay[data-phase="closing"], .sona-now-overlay[data-phase="dragging"]'
    )) {
      saveTimer = window.setTimeout(queueIdleSave, 500)
      return
    }
    try {
      const state = dehydrate(queryClient, {
        shouldDehydrateQuery: (query) =>
          query.state.status === 'success' && query.state.data !== undefined,
      })
      localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), state }))
    } catch { /* quota and privacy failures should not block playback */ }
  }
  const queueIdleSave = () => {
    if ('requestIdleCallback' in window) idleSave = window.requestIdleCallback(save, { timeout: 5000 })
    else save()
  }
  queryClient.getQueryCache().subscribe(() => {
    window.clearTimeout(saveTimer)
    if (idleSave && 'cancelIdleCallback' in window) window.cancelIdleCallback(idleSave)
    saveTimer = window.setTimeout(queueIdleSave, 1200)
  })
}
