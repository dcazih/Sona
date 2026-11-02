import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { NativeHeartTap } from './native-heart-tap'
import { pendingRequest, requestCatalogItem, type CatalogItem, type RequestStatus } from '@/service/sona-catalog'
import './catalog.css'

export function useRequestMusic(item: CatalogItem, status?: RequestStatus) {
  const client = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => requestCatalogItem(item),
    onSuccess: result => {
      void client.invalidateQueries({ queryKey: ['sona-requests'] })
      void client.invalidateQueries({ queryKey: ['sona-catalog-album'] })
      const accepted = pendingRequest(result.status) || ['added','ready'].includes(result.status)
      if (accepted) toast.success(result.message || 'Request added', { autoClose: 3000 })
      else toast.warning(result.message || 'This request needs attention in Requests.', { autoClose: 5000 })
    },
    onError: (error: Error) => toast.error(error.message, { autoClose: 5000 }),
  })
  const working = mutation.isPending || (pendingRequest(status?.state) && !/^(Failed|Rejected|Cancelled|Needs review)/.test(status?.text || '')) || (!status && pendingRequest(mutation.data?.status))
  return { working, request: () => { if (!working && item.requestable !== false) { navigator.vibrate?.(10); mutation.mutate() } } }
}
export function CloudGlyph({ working = false }: { working?: boolean }) {
  return <span className={'sona-request-cloud' + (working ? ' is-working' : '')} aria-hidden="true" />
}
export function CatalogRequestButton({ item, status, className = '' }: { item: CatalogItem; status?: RequestStatus; className?: string }) {
  const { working, request } = useRequestMusic(item, status)
  const label = working ? 'Requesting ' + item.title : 'Request ' + item.title
  return <NativeHeartTap active={working} label={label}>
    <button className={'sona-catalog-request ' + className} type="button" aria-label={label} aria-busy={working}
      disabled={working || item.requestable === false} onClick={request}><CloudGlyph working={working}/></button>
  </NativeHeartTap>
}
