import { useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { catalogFetch, catalogGet, catalogProfile, type RequestStatus } from '@/service/sona-catalog'

/** Live events invalidate metadata availability; downloads alone never unlock playback. */
export function useCatalogRequests() {
  const client = useQueryClient(), profile = catalogProfile()
  const pathname = useLocation().pathname
  const active = pathname === '/mobile-search' || pathname.startsWith('/catalog/')
  const query = useQuery({
    queryKey: ['sona-requests', profile], enabled: active,
    queryFn: ({ signal }) => catalogGet<{ requests: RequestStatus[] }>('requests/live-status', signal),
    staleTime: 3000, refetchInterval: 10000, retry: 1,
  })
  useEffect(() => {
    if (!active) return
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    let refreshedAt = 0
    let reconnect: ReturnType<typeof setTimeout> | undefined
    const refresh = () => {
      if (timer) return
      timer = setTimeout(() => {
        timer = undefined
        refreshedAt = Date.now()
        void client.invalidateQueries({ queryKey: ['sona-requests', profile] })
        void client.invalidateQueries({ queryKey: ['sona-catalog-album', profile] })
        void client.invalidateQueries({ queryKey: ['sona-mobile-search-v2'] })
      }, Math.max(500, 3000 - (Date.now() - refreshedAt)))
    }
    const connect = async () => {
      try {
        const response = await catalogFetch('requests/live-events', { signal: controller.signal })
        const reader = response.body?.getReader()
        if (!reader) throw new Error('No event stream')
        const decoder = new TextDecoder(); let buffer = ''
        while (!controller.signal.aborted) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          let end: number
          while ((end = buffer.indexOf('\n\n')) >= 0) {
            const frame = buffer.slice(0, end); buffer = buffer.slice(end + 2)
            const payload = frame.split('\n').find(line => line.startsWith('data:'))?.slice(5)
            if (!payload) continue
            try {
              const event = JSON.parse(payload) as { kind?: string; id?: string; text?: string }
              if (event.kind === 'refresh') { refresh(); continue }
              if (!event.id || !event.text) continue
              let found = false
              client.setQueryData<{ requests: RequestStatus[] }>(['sona-requests', profile], previous => {
                if (!previous) return previous
                return { requests: previous.requests.map(row => {
                  if (row.kind !== event.kind || (row.id !== event.id && row.mbid !== event.id)) return row
                  found = true
                  return { ...row, text: event.text! }
                }) }
              })
              if (!found || /^(Ready|Imported|Completed|Failed|Cancelled|Rejected)/.test(event.text)) refresh()
            } catch { /* Ignore malformed event frames; the snapshot remains authoritative. */ }
          }
        }
      } catch { /* Polling remains active while the stream reconnects. */ }
      if (!controller.signal.aborted) reconnect = setTimeout(connect, 5000)
    }
    void connect()
    window.addEventListener('sona:requests-changed', refresh)
    return () => { controller.abort(); clearTimeout(timer); clearTimeout(reconnect); window.removeEventListener('sona:requests-changed', refresh) }
  }, [client, profile, active])
  return query
}
