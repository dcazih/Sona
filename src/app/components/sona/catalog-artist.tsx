import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { catalogGet, catalogProfile, type CatalogItem } from '@/service/sona-catalog'
import { CatalogRow } from './catalog-results'
export default function CatalogArtist() {
  const { artistId = '' } = useParams()
  const result = useQuery({ queryKey: ['sona-catalog-artist', catalogProfile(), artistId],
    queryFn: ({ signal }) => catalogGet<{ title: string; albums: CatalogItem[] }>('sona/artists/' + encodeURIComponent(artistId), signal), staleTime: 600000 })
  return <div className="sona-am-search-page"><h1 className="sona-am-search-heading">{result.data?.title || 'Artist'}</h1>
    {result.isPending && <p className="sona-am-status">Loading albums…</p>}
    {result.isError && <p className="sona-am-status" role="alert">{result.error.message} <button onClick={() => void result.refetch()}>Try again</button></p>}
    {result.data?.albums.map(album => <CatalogRow key={album.id} item={album} statuses={[]}/>)}
    {result.data && !result.data.albums.length && <p className="sona-am-status">Nothing to Show.</p>}
  </div>
}
