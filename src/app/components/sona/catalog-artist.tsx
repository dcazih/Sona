import { useDetailArtwork } from '@/app/hooks/use-detail-artwork'
import { useQuery } from '@tanstack/react-query'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useMobileDetailReveal } from '@/app/hooks/use-mobile-detail-reveal'
import { ArtistDetailFallback } from '@/app/components/fallbacks/artists'
import { ArtworkImage } from '@/app/components/artwork-image'
import { catalogGet, catalogProfile, type CatalogItem } from '@/service/sona-catalog'
import { subsonic } from '@/service/subsonic'
import { CatalogRow } from './catalog-results'
import { useCatalogRequests } from './use-catalog'
import './mobile-artist-sections.css'
export function useArtistCatalog(knownId = '', artistName?: string) {
  const discovery = useQuery({ queryKey: ['sona-artist-identity', catalogProfile(), artistName],
    queryFn: ({ signal }) => catalogGet<{ artists: CatalogItem[] }>('sona/search?q=' + encodeURIComponent(artistName!) + '&intent=artist', signal),
    enabled: !knownId && Boolean(artistName), staleTime: 600000 })
  const artistId = knownId || discovery.data?.artists.find(row => [row.title, ...(row.aliases || [])].some(name => name.toLocaleLowerCase() === artistName?.toLocaleLowerCase()))?.id || ''
  const result = useQuery({ queryKey: ['sona-catalog-artist-v2', catalogProfile(), artistId],
    queryFn: ({ signal }) => catalogGet<{ title: string; albums: CatalogItem[]; songs?: CatalogItem[] }>('sona/artists/' + encodeURIComponent(artistId), signal), staleTime: 600000, enabled: Boolean(artistId) })
  const local = useQuery({ queryKey: ['sona-catalog-artist-local', catalogProfile(), result.data?.title],
    queryFn: () => subsonic.songs.getTopSongs(result.data!.title), enabled: Boolean(result.data?.title), staleTime: 600000 })
  return { artistId, discovery, result, local }
}
export default function CatalogArtist({ catalogArtistId, artistName, embedded = false }: { catalogArtistId?: string; artistName?: string; embedded?: boolean } = {}) {
  const params = useParams()
  const location = useLocation()
  const knownId = catalogArtistId || (embedded ? '' : params.artistId) || ''
  const { artistId, discovery, result, local } = useArtistCatalog(knownId, artistName)
  const requests = useCatalogRequests()
  const artworkReady = useDetailArtwork(embedded ? undefined : result.data?.albums[0]?.cover)
  const loading = discovery.isLoading || (Boolean(artistId) && result.isPending) || local.isLoading || !artworkReady
  const black = useMobileDetailReveal(artistId, loading)
  if (black) return <div className="sona-detail-black" aria-label="Loading artist"/>
  if (loading) return <ArtistDetailFallback/>
  if (!result.data) return <p role="alert" className="sona-am-status">{result.error?.message} <button onClick={() => void result.refetch()}>Try again</button></p>
  const artist = result.data
  const albums = artist.albums.filter(album => album.releaseType?.toLowerCase() !== 'single')
  const singles = artist.albums.filter(album => album.releaseType?.toLowerCase() === 'single')
  const songs = artist.songs || []
  const normalize = (s:string) => s.normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim()
  const rail = (title: string, rows: CatalogItem[], large = false) => rows.length > 0 && <section className={'sona-artist-album-section' + (large ? ' is-essential' : '')}>
    <h2>{title}</h2><div className="sona-artist-album-rail">{rows.map(album => <Link className="sona-artist-album-card" key={album.id} to={'/catalog/albums/' + album.id} state={{sonaOpenedFromSearch:location.pathname === '/mobile-search' || Boolean(location.state?.sonaOpenedFromSearch)}}>
      <ArtworkImage src={album.cover} alt="" loading="lazy"/><strong>{album.title}</strong>
    </Link>)}</div></section>
  return <div className="sona-artist-page sona-mobile-artist-sections">
    {!embedded && <h1 className="sona-am-search-heading">{artist.title}</h1>}
    {songs.length > 0 && <section className="sona-artist-popular"><h2>Popular</h2><div className="sona-artist-popular-grid">
      {songs.slice(0,16).map(song => {
        const candidates = (local.data || []).filter(row => row.musicBrainzId === song.id || (!row.musicBrainzId && normalize(row.title) === normalize(song.title) && normalize(row.artist) === normalize(song.artist)))
        const localSong = candidates.length === 1 ? candidates[0] : undefined
        return <CatalogRow key={song.id} item={{...song,localSong,localId:localSong?.id,localCover:localSong?.coverArt}} statuses={requests.data?.requests || []}/>
      })}
    </div></section>}
    {rail('Essential Albums', albums.slice(0,4), true)}
    {rail('Albums', albums)}{rail('Singles', singles)}
    {!artist.albums.length && !songs.length && <p className="sona-am-status">Nothing to Show.</p>}
  </div>
}
