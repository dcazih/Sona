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
  queryClient.getQueryCache().subscribe(() => {
    window.clearTimeout(saveTimer)
    saveTimer = window.setTimeout(() => {
      try {
        const state = dehydrate(queryClient, {
          shouldDehydrateQuery: (query) =>
            query.state.status === 'success' && query.state.data !== undefined,
        })
        localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), state }))
      } catch { /* quota and privacy failures should not block playback */ }
    }, 1200)
  })
}
