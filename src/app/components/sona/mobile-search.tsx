import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight, Search, X, Music2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ImageLoader } from '@/app/components/image-loader'
import { ROUTES } from '@/routes/routesList'
import { subsonic } from '@/service/subsonic'
import { usePlayerActions } from '@/store/player.store'

export default function SonaMobileSearch() {
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')
  const { playSong, setSongList } = usePlayerActions()
  const [albumError, setAlbumError] = useState('')

  useEffect(() => {
    const timeout = window.setTimeout(() => setQuery(input.trim()), 280)
    return () => window.clearTimeout(timeout)
  }, [input])

  const { data, isFetching, isError } = useQuery({
    queryKey: ['sona-mobile-search', query],
    queryFn: () => subsonic.search.get({
      query,
      albumCount: 25,
      artistCount: 25,
      songCount: 35,
    }),
    enabled: query.length >= 2,
    staleTime: 60000,
  })
  const albums = data?.album ?? []
  const songs = data?.song ?? []
  const artists = data?.artist ?? []
  const empty = query.length >= 2 && !isFetching && !isError &&
    albums.length === 0 && songs.length === 0 && artists.length === 0

  async function playAlbum(id: string) {
    setAlbumError('')
    try {
      const album = await subsonic.albums.getOne(id)
      if (!album?.song?.length) {
        setAlbumError('This album has no playable tracks.')
        return
      }
      setSongList(album.song, 0, false, { type: 'album', id: album.id, name: album.name })
    } catch {
      setAlbumError('Could not start this album. Try again.')
    }
  }

  return (
    <div className="sona-search-page">
      <p className="sona-eyebrow">FIND YOUR SOUND</p>
      <h1>Search</h1>
      <label className="sona-search-input">
        <Search size={21} />
        <input autoFocus aria-label="Search your music" type="search" placeholder="Artists, albums, songs"
          value={input} onChange={(event) => setInput(event.target.value)} />
        {input && <button type="button" aria-label="Clear search" onClick={() => setInput('')}><X size={18} /></button>}
      </label>
      {query.length < 2 ? <p className="sona-search-hint">Search your Navidrome library.</p> : (
        <div className="sona-search-results">
          {isFetching && <p className="sona-search-status">Searching...</p>}
          {isError && <p className="sona-search-status">Search failed. Check your Navidrome connection.</p>}
          {albumError && <p className="sona-search-status">{albumError}</p>}
          {empty && <p className="sona-search-status">No matches found.</p>}
          {songs.length > 0 && <section>
            <h2>Songs</h2>
            {songs.map((song) => (
              <div key={song.id} className="sona-search-row">
                <button type="button" className="sona-search-play" onClick={() => playSong(song)}>
                  <span className="sona-search-art">
                    <ImageLoader id={song.coverArt} type="song" size={100}>
                      {(src) => <img src={src} alt="" loading="lazy" />}
                    </ImageLoader>
                  </span>
                  <span className="sona-search-copy"><strong>{song.title}</strong><small>{song.artist}</small></span>
                </button>
                <Link aria-label={'View album for ' + song.title} to={ROUTES.ALBUM.PAGE(song.albumId)}>
                  <ArrowUpRight size={18} />
                </Link>
              </div>
            ))}
          </section>}
          {albums.length > 0 && <section>
            <h2>Albums</h2>
            {albums.map((album) => (
              <div key={album.id} className="sona-search-row">
                <button type="button" className="sona-search-play" onClick={() => void playAlbum(album.id)}>
                  <span className="sona-search-art">
                    <ImageLoader id={album.coverArt} type="album" size={100}>
                      {(src) => <img src={src} alt="" loading="lazy" />}
                    </ImageLoader>
                  </span>
                  <span className="sona-search-copy"><strong>{album.name}</strong><small>{album.artist}</small></span>
                </button>
                <Link aria-label={'View ' + album.name} to={ROUTES.ALBUM.PAGE(album.id)}>
                  <ArrowUpRight size={18} />
                </Link>
              </div>
            ))}
          </section>}
          {artists.length > 0 && <section>
            <h2>Artists</h2>
            {artists.map((artist) => (
              <Link key={artist.id} className="sona-search-row" to={ROUTES.ARTIST.PAGE(artist.id)}>
                <span className="sona-search-art sona-search-artist">
                  {artist.coverArt ? <ImageLoader id={artist.coverArt} type="artist" size={100}>
                    {(src) => <img src={src} alt="" loading="lazy" />}
                  </ImageLoader> : <Music2 size={22} />}
                </span>
                <span className="sona-search-copy"><strong>{artist.name}</strong><small>Artist</small></span>
                <ArrowUpRight size={18} />
              </Link>
            ))}
          </section>}
        </div>
      )}
    </div>
  )
}
