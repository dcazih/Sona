import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { Play, Shuffle } from 'lucide-react'
import { ArtworkImage } from '@/app/components/artwork-image'
import { AlbumFallback } from '@/app/components/fallbacks/album-fallbacks'
import { usePlayerActions } from '@/store/player.store'
import { catalogGet, catalogProfile, type CatalogAlbum, type CatalogItem, type RequestStatus } from '@/service/sona-catalog'
import { SonaMobileAlbumHero } from './mobile-album-hero'
import { SonaMobileAlbumTracks } from './mobile-album-tracks'
import { CatalogRequestButton, CloudGlyph, useRequestMusic } from './catalog-request-button'
import { NativeHeartTap } from './native-heart-tap'
import { useCatalogRequests } from './use-catalog'

function CatalogTrack({ item, status, index }: { item: CatalogItem; status?: RequestStatus; index: number }) {
  const { playSong } = usePlayerActions()
  const { working, request } = useRequestMusic(item, status)
  const title = <button type="button" className="sona-album-song-title" disabled={item.requestable === false && !item.localSong}
    onClick={() => item.localSong ? playSong(item.localSong) : request()}>{item.title}</button>
  return <div className={'sona-album-song-row sona-catalog-row' + (!item.localSong ? ' is-unavailable' : '')}>
    <span className="sona-album-song-index">{item.track || index + 1}</span>
    <div className="sona-album-song-main">{item.localSong ? title : <NativeHeartTap active={working} label={'Request ' + item.title}>{title}</NativeHeartTap>}</div>
    {!item.localSong && <button className="sona-catalog-request" aria-label={'Request ' + item.title} disabled={working || item.requestable === false} onClick={request}><CloudGlyph working={working}/></button>}
  </div>
}
export default function SonaCatalogAlbum() {
  const { albumId = '' } = useParams()
  const profile = catalogProfile()
  const { setSongList } = usePlayerActions()
  const requests = useCatalogRequests()
  const result = useQuery({ queryKey: ['sona-catalog-album', profile, albumId],
    queryFn: ({ signal }) => catalogGet<CatalogAlbum>('sona/albums/' + encodeURIComponent(albumId), signal),
    staleTime: 15000, refetchInterval: 10000, retry: 1 })
  if (!result.data) return result.isError ? <p className="sona-catalog-message" role="alert">{result.error.message} <button onClick={() => void result.refetch()}>Try again</button></p> : <AlbumFallback/>
  const album = result.data, statuses = requests.data?.requests || []
  const status = statuses.find(row => row.kind === 'album' && row.mbid === album.id)
  const playable = album.tracks.flatMap(track => track.localSong ? [track.localSong] : [])
  const play = (shuffle = false) => { if (playable.length) setSongList(playable, 0, shuffle, { type: 'album', id: playable[0].albumId, name: album.title }) }
  return <div className="sona-album-page sona-catalog-album">
    {album.localAlbum ? <><SonaMobileAlbumHero album={album.localAlbum}/><SonaMobileAlbumTracks album={album.localAlbum}/></> : <>
      <section className="sona-mobile-album-hero" aria-label={'Album: ' + album.title}>
        <div className="sona-mobile-album-cover"><ArtworkImage src={album.cover} alt={album.title}/></div>
        <div className="sona-mobile-album-details"><p className="sona-mobile-album-kicker">ALBUM</p><h1>{album.title}</h1>
          <p className="sona-mobile-album-artist">{album.artist}</p><p className="sona-mobile-album-facts">{[album.year, album.tracks.length + ' songs'].filter(Boolean).join(' · ')}</p></div>
        <div className="sona-mobile-album-actions" aria-label="Album controls">
          <button className="sona-mobile-album-round" disabled={playable.length < 2} aria-label={'Shuffle ' + album.title} onClick={() => play(true)}><Shuffle size={22}/></button>
          <button className="sona-mobile-album-play" disabled={!playable.length} aria-label={'Play ' + album.title} onClick={() => play()}><Play size={24} fill="currentColor"/><span>Play</span></button>
          <CatalogRequestButton item={album} status={status} className="sona-mobile-album-round"/>
        </div>
      </section>
      {status && <p className="sona-catalog-message" role="status">{status.text}</p>}
      <section className="sona-album-songs" aria-label={'Tracks on ' + album.title}><div className="sona-album-songs-list">
        {album.tracks.map((track, index) => <CatalogTrack key={track.id + ':' + index} item={track} index={index} status={statuses.find(row => row.kind === 'track' && row.mbid === track.id) || status}/>)}
      </div></section>
      {!album.tracks.length && <p className="sona-catalog-message">No track list available.</p>}
    </>}
    {result.isError && <p className="sona-catalog-message" role="alert">Couldn’t refresh availability. <button onClick={() => void result.refetch()}>Retry</button></p>}
  </div>
}
