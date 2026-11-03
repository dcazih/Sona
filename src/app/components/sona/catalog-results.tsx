import { relevantLocal, mergeRelevant, type SearchIdentity } from '@/service/search-relevance'
import { NativeHeartTap } from './native-heart-tap'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArtworkImage } from '@/app/components/artwork-image'
import { ImageLoader } from '@/app/components/image-loader'
import { SonaNoteGlyph } from '@/app/components/header/sona-note-glyph'
import { usePlayerActions, usePlayerCurrentSong } from '@/store/player.store'
import { PlaybackIndicator } from './playing-bars'
import { ROUTES } from '@/routes/routesList'
import { catalogGet, catalogProfile, type CatalogItem, type RequestStatus } from '@/service/sona-catalog'
import type { ISearchResponse } from '@/types/responses/search'
import { useCatalogRequests } from './use-catalog'
import { CloudGlyph, useRequestMusic } from './catalog-request-button'
import type { SearchFilter } from './search-state'
import type { RecentItem } from './mobile-search'

type Item = CatalogItem & { localId?: string; localCover?: string; identityId?: string }
const normalize = (value?: string) => (value || '').normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
export function CatalogRow({ item, statuses, remember }: { item: Item; statuses: RequestStatus[]; remember?: (item: RecentItem) => void }) {
  const location = useLocation()
  const navigate = useNavigate(), { playSong } = usePlayerActions()
  const currentSong = usePlayerCurrentSong()
  const active = item.kind === 'song' && item.localSong?.id === currentSong?.id
  const status = statuses.find(row => row.mbid === item.id && row.kind === (item.kind === 'song' ? 'track' : 'album'))
  const verification = useQuery({
    queryKey: ['sona-candidate-verification', catalogProfile(), item.kind, item.id, item.albumId],
    queryFn: ({signal}) => catalogGet<{requestable:boolean}>('sona/verify?kind='+item.kind+'&id='+encodeURIComponent(item.id)+'&album_id='+encodeURIComponent(item.albumId || ''),signal),
    enabled: Boolean(!item.localId && item.kind === 'song' && item.verificationPending),
    staleTime: 600000, retry: 0,
  })
  const resolvedItem = verification.data ? {...item, requestable:verification.data.requestable} : item
  const { working:requestWorking, request } = useRequestMusic(resolvedItem, status)
  const working = requestWorking || verification.isFetching
  const missing = item.kind === 'song' && !item.localSong
  const open = () => {
    remember?.({ id: item.localId || item.id, title: item.title, subtitle: item.artist, type: item.kind,
      coverArt: item.localCover, coverUrl: item.cover, catalog: !item.localId, albumId: item.localSong?.albumId || item.albumId })
    if (item.kind === 'song') { if (item.localSong) playSong(item.localSong); else if (item.albumId) navigate('/catalog/albums/' + item.albumId, { state: { sonaOpenedFromSearch: location.pathname === '/mobile-search' || Boolean(location.state?.sonaOpenedFromSearch) } }); return }
    navigate(item.localId ? (item.kind === 'artist' ? ROUTES.ARTIST.PAGE(item.localId) : ROUTES.ALBUM.PAGE(item.localId)) : '/catalog/' + (item.kind === 'artist' ? 'artists/' : 'albums/') + item.id, { state: { sonaOpenedFromSearch: location.pathname === '/mobile-search' || Boolean(location.state?.sonaOpenedFromSearch) } })
  }
  const info = <button type="button" className="sona-am-result-info" onClick={open} aria-label={item.title}>
    <span className={'sona-am-result-art ' + (item.kind === 'artist' ? 'is-artist' : '')}>
      {item.localCover ? <ImageLoader id={item.localCover} type={item.kind} size={130}>{src => <ArtworkImage src={src} alt=""/>}</ImageLoader>
        : item.cover ? <ArtworkImage src={item.cover} alt="" loading="lazy"/> : <SonaNoteGlyph size={23}/>}
    </span>
    <span className="sona-am-result-copy"><strong>{item.title}</strong><small>{item.artist}{item.album ? ' · ' + item.album : ''}</small></span>
  </button>
  return <div className={'sona-am-search-row sona-catalog-row' + (missing ? ' is-unavailable' : '') + (active ? ' is-playing' : '')}>
    {info}
    {missing ? <NativeHeartTap active={working} label={'Request ' + item.title}><button type="button" className="sona-catalog-request" aria-label={verification.isFetching ? 'Checking request identity' : working ? 'Request in progress' : 'Request ' + item.title} disabled={working || resolvedItem.requestable === false} onClick={request}><CloudGlyph working={working}/></button></NativeHeartTap>
      : item.kind === 'song' ? <button className="sona-am-result-play" aria-label={'Play ' + item.title} onClick={open}><PlaybackIndicator active={active}/></button>
      : <button className="sona-am-result-play" aria-label={'Open ' + item.title} onClick={open}><ChevronRight size={20}/></button>}
  </div>
}

type LocalResults = NonNullable<ISearchResponse['searchResult3']>
export function CatalogResults({ query, filter, local, remember }: { query: string; filter: SearchFilter; local?: LocalResults; remember: (item: RecentItem) => void }) {
  const profile = catalogProfile()
  const catalogue = useQuery({ queryKey: ['sona-catalog-search-v4', profile, query, filter === 'artists' ? 'artist' : 'auto'],
    queryFn: ({ signal }) => catalogGet<SearchIdentity & { albums: CatalogItem[]; artists: CatalogItem[]; songs: CatalogItem[]; status?: Record<string,string> }>('sona/search?q=' + encodeURIComponent(query) + (filter === 'artists' ? '&intent=artist' : ''), signal),
    enabled: query.length >= 2, staleTime: 600000, retry: 1 })
  const requests = useCatalogRequests()
  const statuses = requests.data?.requests || []
  const localSongs: Item[] = (local?.song || []).map(song => ({ id: song.id, identityId: song.musicBrainzId || song.id, localId: song.id, kind: 'song', title: song.title, artist: song.artist, album: song.album, localCover: song.coverArt, localSong: song }))
  const remoteSongs = (catalogue.data?.songs || []).filter(song => !(local?.song || []).some(s =>
    s.musicBrainzId ? s.musicBrainzId === song.id : normalize(s.title) === normalize(song.title) && normalize(s.artist) === normalize(song.artist) && normalize(s.album) === normalize(song.album)))
  const localAlbums: Item[] = (local?.album || []).map(album => ({ id: album.id, identityId: album.musicBrainzId || album.id, localId: album.id, kind: 'album', title: album.name, artist: album.artist, localCover: album.coverArt }))
  const remoteAlbums = (catalogue.data?.albums || []).filter(album => !localAlbums.some(a => normalize(a.title) === normalize(album.title) && normalize(a.artist) === normalize(album.artist)))
  const localArtists: Item[] = (local?.artist || []).map(artist => ({ id: artist.id, identityId: artist.id, localId: artist.id, kind: 'artist', title: artist.name, artist: 'Artist', localCover: artist.coverArt }))
  const remoteArtists = (catalogue.data?.artists || []).filter(artist => !localArtists.some(a => normalize(a.title) === normalize(artist.title)))
  const rankedLocalSongs = relevantLocal(localSongs,'song',query,catalogue.data)
  const rankedLocalAlbums = relevantLocal(localAlbums,'album',query,catalogue.data)
  const rankedLocalArtists = relevantLocal(localArtists,'artist',query,catalogue.data)
  const priority = catalogue.data?.intent === 'artist' ? 'artists' : catalogue.data?.intent === 'album' ? 'albums' : 'songs'
  const groups: [SearchFilter, string, Item[]][] = [['songs','Songs',mergeRelevant(rankedLocalSongs,remoteSongs)],['albums','Albums',mergeRelevant(rankedLocalAlbums,remoteAlbums)],['artists','Artists',mergeRelevant(rankedLocalArtists,remoteArtists,3)]]
  groups.sort((a,b)=>Number(b[0]===priority)-Number(a[0]===priority))
  return <>
    {groups.filter(([key]) => filter === 'all' || filter === key).map(([key, label, items]) => items.length > 0 && <section className="sona-am-result-section" key={key}><h2>{label}</h2>
      {items.map(item => <CatalogRow key={(item.localId ? 'local:' : 'catalog:') + item.id} item={item} statuses={statuses} remember={remember}/>)}</section>)}
    {(catalogue.isFetching) && <p className="sona-am-status" role="status">Searching Sona Music…</p>}
    {catalogue.error && <p className="sona-am-status" role="alert">{catalogue.error?.message} <button onClick={() => { void catalogue.refetch() }}>Try again</button></p>}
    {Object.values(catalogue.data?.status || {}).some(value => value !== 'ok') && <p className="sona-am-status">Some catalogue results are still unavailable. <button onClick={() => void catalogue.refetch()}>Retry</button></p>}
    {!catalogue.isFetching && !catalogue.isError && groups.filter(([key]) => filter === 'all' || filter === key).every(([, , items]) => !items.length) && <p className="sona-am-status">No matches found for “{query}”.</p>}
  </>
}
