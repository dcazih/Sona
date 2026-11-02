import { useQuery } from '@tanstack/react-query'
import { ArrowRight, ChevronRight, Play, Search } from 'lucide-react'
import { SongExplicitMark } from './song-explicit-mark'
import { SonaNoteGlyph } from '@/app/components/header/sona-note-glyph'
import { ArtworkImage } from '@/app/components/artwork-image'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ImageLoader } from '@/app/components/image-loader'
import { ROUTES } from '@/routes/routesList'
import { subsonic } from '@/service/subsonic'
import { usePlayerActions } from '@/store/player.store'
import { useAppStore } from '@/store/app.store'
import { DISCOVER_PHOTOS, matchingGenre, rankDiscoverOnceDaily } from './search-discovery'
import { useSonaSearch, type SearchFilter } from './search-state'

type RecentItem = { id: string; title: string; subtitle: string; type: 'song' | 'album' | 'artist' | 'query'; coverArt?: string; albumId?: string; explicitStatus?: string }
const RECENTS_KEY = 'sona-mobile-recent-searches'
const SCOPE_KEY = 'sona-mobile-search-scope'
type SearchScope = 'sona' | 'library'
function lastSearchScope(): SearchScope {
  try { return window.localStorage.getItem(SCOPE_KEY) === 'library' ? 'library' : 'sona' }
  catch { return 'sona' }
}

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
  const discoveryProfile = useAppStore(state=>state.data.url+'|'+state.data.username)
  const [discoveryDay,setDiscoveryDay] = useState(()=>new Date().toDateString())
  const term = useSonaSearch((state) => state.term)
  const setTerm = useSonaSearch((state) => state.setTerm)
  const focused = useSonaSearch((state) => state.focused)
  const engaged = useSonaSearch((state) => state.engaged)
  const setEngaged = useSonaSearch((state) => state.setEngaged)
  const setFocused = useSonaSearch((state) => state.setFocused)
  const filter = useSonaSearch((state) => state.filter)
  const setFilter = useSonaSearch((state) => state.setFilter)
  const [query, setQuery] = useState('')
  const [recent, setRecent] = useState<RecentItem[]>(loadRecents)
  const [errorMessage, setErrorMessage] = useState('')
  const [searchScope, setSearchScope] = useState<SearchScope>(lastSearchScope)
  const [scopeDrag, setScopeDrag] = useState<number | null>(null)
  const scopeGesture = useRef<{ id: number; x: number; y: number; moved: boolean; preserveKeyboard: boolean } | null>(null)
  const scopeEl = useRef<HTMLDivElement>(null)
  const blockScopeClickUntil = useRef(0)
  const { playSong, setSongList } = usePlayerActions()

  const chooseScope = (scope: SearchScope) => {
    setSearchScope(scope)
    try { window.localStorage.setItem(SCOPE_KEY, scope) } catch { /* unavailable in private browsing */ }
  }

  const progressFromPointer = (x: number) => {
    const rect = scopeEl.current?.getBoundingClientRect()
    if (!rect) return searchScope === 'library' ? 1 : 0
    // Offset from the midpoint of the left capsule to the right capsule.
    const half = rect.width / 2
    return Math.max(0, Math.min(1, (x - rect.left - half / 2) / half))
  }
  const onScopeDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return
    // Keep Safari's keyboard active when toggling between search scopes.
    const active = document.activeElement
    if (active instanceof HTMLInputElement && active.closest('.sona-search-morph-field')) {
      event.preventDefault()
    }
    scopeGesture.current = {
      id: event.pointerId, x: event.clientX, y: event.clientY, moved: false,
      preserveKeyboard: active instanceof HTMLInputElement &&
        Boolean(active.closest('.sona-search-morph-field')),
    }
  }
  const onScopeMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = scopeGesture.current
    if (!gesture || event.pointerId !== gesture.id) return
    const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y
    if (!gesture.moved && Math.abs(dy) > Math.abs(dx) * 1.3) {
      scopeGesture.current = null
      setScopeDrag(null)
      return
    }
    if (Math.abs(dx) < 5 && !gesture.moved) return
    if (!gesture.moved) {
      gesture.moved = true
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    setScopeDrag(Math.round(progressFromPointer(event.clientX)))
    if (event.cancelable) event.preventDefault()
  }
  const onScopeUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = scopeGesture.current
    if (!gesture || event.pointerId !== gesture.id) return
    // Tap and drag both resolve here; the button doesn't need to take focus.
    blockScopeClickUntil.current = Date.now() + 320
    if (gesture.preserveKeyboard) {
      const input = document.querySelector<HTMLInputElement>('.sona-search-morph-field input')
      if (input && document.activeElement !== input) input.focus({ preventScroll: true })
    }
    chooseScope(progressFromPointer(event.clientX) >= .5 ? 'library' : 'sona')
    scopeGesture.current = null
    setScopeDrag(null)
  }
  const onScopeCancel = () => {
    scopeGesture.current = null
    setScopeDrag(null)
  }
  const onScopeClick = (scope: SearchScope) => {
    if (Date.now() < blockScopeClickUntil.current) return
    chooseScope(scope)
  }


  // iOS Safari can blur focused inputs on touchstart even when pointerdown was
  // prevented. Suppress ONLY that native touch default while search is focused.
  // Listeners are non-passive, because a passive touchstart cannot prevent blur.
  useEffect(() => {
    const scope = scopeEl.current
    if (!scope) return
    const keepFocus = (event: TouchEvent) => {
      const input = document.querySelector<HTMLInputElement>('.sona-search-morph-field input')
      if (input && document.activeElement === input && event.cancelable) {
        event.preventDefault()
      }
    }
    scope.addEventListener('touchstart', keepFocus, { capture: true, passive: false })
    return () => scope.removeEventListener('touchstart', keepFocus, true)
  }, [focused, engaged])

  useEffect(() => {
    const timeout = window.setTimeout(() => setQuery(term.trim()), 320)
    return () => window.clearTimeout(timeout)
  }, [term])

  const { data: searchData, isFetching, isError } = useQuery({
    queryKey: ['sona-mobile-search-v2', query],
    queryFn: () => subsonic.search.get({ query, albumCount: 35, artistCount: 35, songCount: 60 }),
    enabled: query.length >= 2,
    staleTime: 10 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  })
  const { data: genres } = useQuery({
    queryKey: ['sona-mobile-genre-browse'],
    queryFn: () => subsonic.genres.get(),
    staleTime: 300000,
  })
  const { data: frequentAlbums } = useQuery({
    queryKey: ['sona-mobile-browse-art','frequent',discoveryProfile],
    queryFn: () => subsonic.albums.getAlbumList({ type: 'frequent', size: 180 }),
    staleTime: 30 * 60 * 1000,
  })
  const { data: recentAlbums } = useQuery({
    queryKey: ['sona-mobile-browse-art','recent',discoveryProfile],
    queryFn: () => subsonic.albums.getAlbumList({ type: 'recent', size: 80 }),
    staleTime: 30 * 60 * 1000,
  })
  useEffect(()=>{
    const timer=window.setInterval(()=>{
      const today=new Date().toDateString()
      setDiscoveryDay(previous=>previous===today?previous:today)
    },60000)
    return ()=>window.clearInterval(timer)
  },[])

  const resultsReady = term.trim() === query
  const songs = resultsReady ? searchData?.song ?? [] : []
  const albums = resultsReady ? searchData?.album ?? [] : []
  const artists = resultsReady ? searchData?.artist ?? [] : []
  const hasResults = songs.length > 0 || albums.length > 0 || artists.length > 0
  const activeSearch = engaged || term.length > 0

  const browse=useMemo(()=>{
    const available=genres||[]
    const popular=frequentAlbums?.list||[]
    const recent=recentAlbums?.list||[]
    return rankDiscoverOnceDaily(discoveryProfile,popular,recent,available).map(category=>({
      ...category,
      matchedGenre:matchingGenre(category,available),
      photoUrl:DISCOVER_PHOTOS[category.id],
    }))
  },[discoveryProfile,discoveryDay,genres,frequentAlbums,recentAlbums])

  function openCategory(category:typeof browse[number]){
    if(category.matchedGenre){
      navigate(ROUTES.GENRE.PAGE(category.matchedGenre))
      return
    }
    setTerm(category.query)
    setFilter('all')
    setEngaged(true)
    navigate('/mobile-search')
  }

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

  useEffect(() => {
    const onSubmit = (event: Event) => {
      const value = (event as CustomEvent<string>).detail?.trim()
      if (!value) return
      remember({ id: 'query:' + value.toLocaleLowerCase(), type: 'query', title: value, subtitle: 'Search' })
      setEngaged(true)
    }
    window.addEventListener('sona-search-submit', onSubmit)
    return () => window.removeEventListener('sona-search-submit', onSubmit)
  })

  function visit(item: RecentItem) {
    remember(item)
    if (item.type === 'query') {
      setTerm(item.title)
      setFilter('all')
      setEngaged(true)
      return
    }
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
                {(src) => item.type === 'artist'
                  ? <img src={src} alt="" loading="lazy" />
                  : <ArtworkImage src={src} alt="" loading="lazy" />}
              </ImageLoader>
            ) : item.type === 'query' ? <Search size={22}/> : <SonaNoteGlyph size={23}/>}
          </span>
          <span className="sona-am-result-copy">
            <strong>{item.title}{item.type === 'song' && <SongExplicitMark song={item}/>}</strong>
            <small>{item.type === 'song' ? 'Song' : item.type === 'album' ? 'Album' : item.type === 'artist' ? 'Artist' : 'Search'}{item.type !== 'query' && item.subtitle ? ' · ' + item.subtitle : ''}</small>
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
      <div className="sona-search-visible-top" aria-hidden="true" />
      {!activeSearch ? (
        <>
          <h1 className="sona-am-search-heading">Search</h1>
          <section className="sona-am-browse" aria-label="Browse music categories">
            <div className="sona-am-genre-grid">
              {browse.map(category=>(
                <button key={category.id} type="button"
                  className="sona-am-genre-card"
                  aria-label={'Explore '+category.title}
                  onClick={()=>openCategory(category)}
                  style={{'--sona-category-color':category.color} as CSSProperties}>
                  <span className="sona-am-genre-art" aria-hidden="true">
                    <img src={category.photoUrl} alt="" className="sona-am-category-photo"
                      loading="lazy" decoding="async"
                      onError={event=>{event.currentTarget.style.visibility='hidden'}}/>
                  </span>
                  <span className="sona-am-category-label">{category.title}</span>
                </button>
              ))}
            </div>
          </section>
        </>
      ) : (
        <>
          <div ref={scopeEl}
            className={'sona-search-scope' + (scopeDrag !== null ? ' is-dragging' : '')}
            role="group" aria-label="Search source"
            style={{ '--sona-scope-progress': scopeDrag ?? (searchScope === 'library' ? 1 : 0) } as CSSProperties}
            onPointerDown={onScopeDown} onPointerMove={onScopeMove}
            onPointerUp={onScopeUp} onPointerCancel={onScopeCancel}>
            <span className="sona-search-scope-thumb" aria-hidden="true" />
            <button type="button" className={searchScope === 'sona' ? 'is-selected' : ''}
              aria-pressed={searchScope === 'sona'} onClick={() => onScopeClick('sona')}>Sona Music</button>
            <button type="button" className={searchScope === 'library' ? 'is-selected' : ''}
              aria-pressed={searchScope === 'library'} onClick={() => onScopeClick('library')}>Library</button>
          </div>
          {term.trim().length === 0 ? (
            <section className="sona-am-recent">

              {recent.length > 0 && <>
                <div className="sona-am-section-bar sona-am-recent-title">
                  <h2>Recently Searched</h2>
                  <button type="button" onClick={clearRecent}>Clear</button>
                </div>
                {recent.map((item) => renderRow(item))}
              </>}
            </section>
          ) : (
            <div className="sona-am-live-results">
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
              {(isFetching || !resultsReady) && <p className="sona-am-status">Searching your library...</p>}
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
                    coverArt:song.coverArt,albumId:song.albumId,explicitStatus:song.explicitStatus,
                  },() => {
                    remember({ id:song.id,type:'song',title:song.title,subtitle:song.artist,coverArt:song.coverArt,albumId:song.albumId,explicitStatus:song.explicitStatus })
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
