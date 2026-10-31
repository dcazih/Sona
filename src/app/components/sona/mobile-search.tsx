import { useQuery } from '@tanstack/react-query'
import { ArrowRight, ChevronRight, Play, Search } from 'lucide-react'
import { SonaNoteGlyph } from '@/app/components/header/sona-note-glyph'
import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ImageLoader } from '@/app/components/image-loader'
import { ROUTES } from '@/routes/routesList'
import { subsonic } from '@/service/subsonic'
import { usePlayerActions } from '@/store/player.store'
import { useSonaSearch, type SearchFilter } from './search-state'
import { getMainScrollElement } from '@/utils/scrollPageToTop'

type RecentItem = { id: string; title: string; subtitle: string; type: 'song' | 'album' | 'artist'; coverArt?: string; albumId?: string }
const RECENTS_KEY = 'sona-mobile-recent-searches'
const genresColors = [
  ['#635fef', '#17193c'], ['#e563a3','#48162d'], ['#1f9f87','#07362c'],
  ['#f19a3a','#5c1924'], ['#3772e3','#191d50'], ['#e44f54','#511c37'],
  ['#8e68dc','#292044'], ['#caa23e','#564225'], ['#5ac6c0','#1d3c4b'],
  ['#e8667c','#54213e'], ['#3f9b76','#143f30'], ['#7e84bd','#383353'],
]

function loadRecents(): RecentItem[] {
  try {
    const stored = JSON.parse(localStorage.getItem(RECENTS_KEY) || '[]') as unknown
    return Array.isArray(stored)
      ? stored.filter((item): item is RecentItem => typeof item === 'object' && item !== null && typeof item.id === 'string').slice(0, 16)
      : []
  } catch { return [] }
}

export default function SonaMobileSearch() {
  const navigate = useNavigate()
  const term = useSonaSearch((state) => state.term)
  const setTerm = useSonaSearch((state) => state.setTerm)
  const focused = useSonaSearch((state) => state.focused)
  const setFocused = useSonaSearch((state) => state.setFocused)
  const filter = useSonaSearch((state) => state.filter)
  const setFilter = useSonaSearch((state) => state.setFilter)
  const [query, setQuery] = useState('')
  const [recent, setRecent] = useState<RecentItem[]>(loadRecents)
  const [errorMessage, setErrorMessage] = useState('')
  const [stageKey, setStageKey] = useState(0)
  const { playSong, setSongList } = usePlayerActions()

  useEffect(() => {
    // A new query must always start at the top of the result list, even
    // when the user entered Search while scrolled far down.
    getMainScrollElement()?.scrollTo({ top: 0, behavior: 'auto' })
    const timeout = window.setTimeout(() => setQuery(term.trim()), 520)
    return () => window.clearTimeout(timeout)
  }, [term])

  useLayoutEffect(() => {
    // After a new search, the first results must remain visible at the top
    // rather than inheriting Safari's previous scroll position.
    const viewport = getMainScrollElement()
    viewport?.scrollTo({ top: 0, behavior: 'instant' })
  }, [query, filter])

  useEffect(() => {
    if (query.length) setStageKey((value) => value + 1)
  }, [query, filter])

  const { data: searchData, isFetching, isError } = useQuery({
    queryKey: ['sona-mobile-search-v2', query],
    queryFn: () => subsonic.search.get({ query, albumCount: 35, artistCount: 35, songCount: 60 }),
    enabled: query.length >= 2,
    staleTime: 10 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    placeholderData: (previous) => previous,
  })
  const { data: genres } = useQuery({
    queryKey: ['sona-mobile-genre-browse'],
    queryFn: () => subsonic.genres.get(),
    staleTime: 300000,
  })
  const { data: albumList } = useQuery({
    queryKey: ['sona-mobile-browse-art'],
    queryFn: () => subsonic.albums.getAlbumList({ type: 'frequent', size: 100 }),
    staleTime: 300000,
  })

  const songs = searchData?.song ?? []
  const albums = searchData?.album ?? []
  const artists = searchData?.artist ?? []
  const hasResults = songs.length > 0 || albums.length > 0 || artists.length > 0
  const activeSearch = focused || term.length > 0

  const browse = useMemo(() => {
    const options = (genres ?? []).filter((g) => (g.albumCount || g.songCount) > 0)
      .sort((a,b) => b.albumCount - a.albumCount).slice(0, 18)
    return options.map((genre, index) => ({
      name: genre.value,
      cover: albumList?.list?.find((album) => album.genre?.toLowerCase() === genre.value.toLowerCase())?.coverArt,
      colors: genresColors[index % genresColors.length],
    }))
  }, [genres, albumList])

  function remember(item: RecentItem) {
    setRecent((previous) => {
      const next = [item, ...previous.filter((other) => other.id !== item.id || other.type !== item.type)].slice(0, 16)
      try { localStorage.setItem(RECENTS_KEY, JSON.stringify(next)) } catch { /* private browsing */ }
      return next
    })
  }

  function clearRecent() {
    setRecent([])
    try { localStorage.removeItem(RECENTS_KEY) } catch { /* private browsing */ }
  }

  function visit(item: RecentItem) {
    remember(item)
    if (item.type === 'artist') navigate(ROUTES.ARTIST.PAGE(item.id))
    else navigate(ROUTES.ALBUM.PAGE(item.albumId || item.id))
    setFocused(false)
  }

  async function startAlbum(id: string, name: string) {
    setErrorMessage('')
    try {
      const album = await subsonic.albums.getOne(id)
      if (!album?.song?.length) {
        setErrorMessage('No playable songs were found in this album.')
        return
      }
      setSongList(album.song, 0, false, { type: 'album', id, name })
    } catch {
      setErrorMessage('Could not start playback. Check the connection and try again.')
    }
  }

  function chooseSuggestion(value: string) {
    setTerm(value)
    setFilter('all')
    setFocused(true)
  }

  function renderRow(item: RecentItem, onPlay?: () => void) {
    return (
      <div className="sona-am-search-row" key={item.type + ':' + item.id}>
        <button type="button" className="sona-am-result-info" onClick={() => visit(item)}>
          <span className={'sona-am-result-art ' + (item.type === 'artist' ? 'is-artist' : '')}>
            {item.coverArt ? (
              <ImageLoader id={item.coverArt} type={item.type === 'song' ? 'song' : item.type === 'album' ? 'album' : 'artist'} size={130}>
                {(src) => <img src={src} alt="" loading="lazy" />}
              </ImageLoader>
            ) : <SonaNoteGlyph size={23}/>}
          </span>
          <span className="sona-am-result-copy">
            <strong>{item.title}</strong>
            <small>{item.type === 'song' ? 'Song' : item.type === 'album' ? 'Album' : 'Artist'}{item.subtitle ? ' · ' + item.subtitle : ''}</small>
          </span>
          {!onPlay && <ChevronRight size={20} className="sona-am-row-chevron"/>}
        </button>
        {onPlay && <button type="button" className="sona-am-result-play" aria-label={'Play ' + item.title} onClick={onPlay}><Play size={16} fill="currentColor"/></button>}
      </div>
    )
  }

  const suggestionTerm = term.trim()
  const showSongs = filter === 'all' || filter === 'songs'
  const showAlbums = filter === 'all' || filter === 'albums'
  const showArtists = filter === 'all' || filter === 'artists'

  return (
    <div className={'sona-am-search-page ' + (activeSearch ? 'is-search-active' : '')}>
      {activeSearch && <div className="sona-search-page-veil" key={'veil-' + stageKey} aria-hidden="true" />}
      {!activeSearch ? (
        <>
          <h1 className="sona-am-search-heading">Search</h1>
          <section className="sona-am-browse">
            <h2>Browse Your Music</h2>
            {browse.length > 0 ? (
              <div className="sona-am-genre-grid">
                {browse.map((genre) => (
                  <Link to={ROUTES.ALBUMS.GENRE(genre.name)} key={genre.name}
                    className="sona-am-genre-card"
                    style={{ background: 'linear-gradient(145deg,' + genre.colors[0] + ',' + genre.colors[1] + ')' }}>
                    {genre.cover && (
                      <ImageLoader id={genre.cover} type="album" size={400}>
                        {(src) => <img src={src} alt="" loading="lazy"/>}
                      </ImageLoader>
                    )}
                    <span>{genre.name}</span>
                  </Link>
                ))}
              </div>
            ) : <p className="sona-am-browse-loading">Your music genres will appear here when your library loads.</p>}
          </section>
        </>
      ) : (
        <>
          {term.trim().length === 0 ? (
            <section className="sona-am-recent sona-am-in">
              {recent.length > 0 ? (
                <>
                  <div className="sona-am-section-bar">
                    <h2>Recently Searched</h2>
                    <button type="button" onClick={clearRecent}>Clear</button>
                  </div>
                  {recent.map((item) => renderRow(item))}
                </>
              ) : (
                <div className="sona-am-empty-search">
                  <Search size={32} />
                  <h2>Find what you love.</h2>
                  <p>Search songs, albums and artists in your music library.</p>
                </div>
              )}
            </section>
          ) : (
            <div className="sona-am-live-results sona-am-in" key={'results-' + stageKey}>
              <div className="sona-am-filter-pills" role="group" aria-label="Filter search results">
                {([['all','All'],['songs','Songs'],['albums','Albums'],['artists','Artists']] as [SearchFilter,string][]).map(([value,label])=> (
                  <button type="button" key={value} aria-pressed={filter===value}
                    className={filter===value ? 'is-selected' : ''}
                    onClick={() => setFilter(value)}>{label}</button>
                ))}
              </div>
              <div className="sona-am-suggestions">
                <button type="button" onClick={() => chooseSuggestion(suggestionTerm)}>
                  <Search size={17}/><strong>{suggestionTerm}</strong><ArrowRight size={16}/>
                </button>
                {term.trim().includes(' ') ? null : (
                  <button type="button" onClick={() => setFilter('artists')}>
                    <Search size={17}/><strong>{suggestionTerm}</strong><span>Artists</span><ArrowRight size={16}/>
                  </button>
                )}
              </div>
              {errorMessage && <p className="sona-am-status">{errorMessage}</p>}
              {isError && <p className="sona-am-status">Search failed. Check your Navidrome connection.</p>}
              {isFetching && <p className="sona-am-status">Searching your library...</p>}
              {query.length >= 2 && !isFetching && !isError && !hasResults &&
                <p className="sona-am-status">No matches found for “{query}”.</p>}
              {showArtists && artists.length > 0 &&
                <section className="sona-am-result-section">
                  <h2>Artists</h2>
                  {artists.map((artist) => renderRow({
                    id:artist.id, type:'artist', title:artist.name,
                    subtitle:'Artist',coverArt:artist.coverArt,
                  }))}
                </section>}
              {showAlbums && albums.length > 0 &&
                <section className="sona-am-result-section">
                  <h2>Albums</h2>
                  {albums.map((album) => renderRow({
                    id:album.id, type:'album', title:album.name,
                    subtitle:album.artist,coverArt:album.coverArt,
                  },() => {
                    remember({ id:album.id,type:'album',title:album.name,subtitle:album.artist,coverArt:album.coverArt })
                    void startAlbum(album.id,album.name)
                  }))}
                </section>}
              {showSongs && songs.length > 0 &&
                <section className="sona-am-result-section">
                  <h2>Songs</h2>
                  {songs.map((song) => renderRow({
                    id:song.id,type:'song',title:song.title,subtitle:song.artist,
                    coverArt:song.coverArt,albumId:song.albumId,
                  },() => {
                    remember({ id:song.id,type:'song',title:song.title,subtitle:song.artist,coverArt:song.coverArt,albumId:song.albumId })
                    playSong(song)
                  }))}
                </section>}
            </div>
          )}
        </>
      )}
    </div>
  )
}
