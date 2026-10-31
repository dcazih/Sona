import { useInfiniteQuery } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Check, ChevronRight, Ellipsis, Heart, LibraryBig, ListMusic, Mic2, Music2, Podcast, Radio, Tags, X, Disc3 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { ArtworkImage } from '@/app/components/artwork-image'
import { ImageLoader } from '@/app/components/image-loader'
import { openSonaAlbumFromCover } from '@/app/components/sona/album-morph'
import { ROUTES } from '@/routes/routesList'
import { subsonic } from '@/service/subsonic'
import { useAppStore } from '@/store/app.store'
import { getMainScrollElement } from '@/utils/scrollPageToTop'

const sections = [
  { id: 'playlists', name: 'Playlists', icon: ListMusic, href: ROUTES.LIBRARY.PLAYLISTS },
  { id: 'artists', name: 'Artists', icon: Mic2, href: ROUTES.LIBRARY.ARTISTS },
  { id: 'albums', name: 'Albums', icon: Disc3, href: ROUTES.LIBRARY.ALBUMS },
  { id: 'songs', name: 'Songs', icon: Music2, href: ROUTES.LIBRARY.SONGS },
  { id: 'favorites', name: 'Favorites', icon: Heart, href: ROUTES.LIBRARY.FAVORITES },
  { id: 'genres', name: 'Genres', icon: Tags, href: ROUTES.LIBRARY.GENRES },
  { id: 'podcasts', name: 'Podcasts', icon: Podcast, href: ROUTES.LIBRARY.PODCASTS },
  { id: 'radio', name: 'Radio Stations', icon: Radio, href: ROUTES.LIBRARY.RADIOS },
] as const

type SectionId = (typeof sections)[number]['id']
const defaultSections: SectionId[] = ['playlists','artists','albums','songs','favorites']
const albumPageSize = 24

function storageKey(username: string) {
  return 'sona-mobile-library-sections-v1:' + (username || 'guest')
}

function readSections(username: string): SectionId[] {
  try {
    const saved = JSON.parse(window.localStorage.getItem(storageKey(username)) || 'null') as unknown
    if (!Array.isArray(saved)) return [...defaultSections]
    const known = sections.map(item => item.id)
    const result = [...new Set(saved.filter((id): id is SectionId => typeof id === 'string' && known.includes(id as SectionId)))]
    return result
  } catch {
    return [...defaultSections]
  }
}

export default function SonaMobileLibrary() {
  const username = useAppStore(state => state.data.username)
  const navigate = useNavigate()
  const [enabled, setEnabled] = useState<SectionId[]>(() => readSections(username))
  const [editing, setEditing] = useState(false)
  const loadMoreMarker = useRef<HTMLDivElement>(null)

  useEffect(() => { setEnabled(readSections(username)) }, [username])

  const save = (next: SectionId[]) => {
    setEnabled(next)
    try { window.localStorage.setItem(storageKey(username), JSON.stringify(next)) }
    catch { /* Private mode may disallow persistent preferences. */ }
  }

  const toggle = (id: SectionId) => {
    save(enabled.includes(id) ? enabled.filter(item => item !== id) : [...enabled, id])
  }

  const move = (id: SectionId, direction: -1 | 1) => {
    const at = enabled.indexOf(id)
    const target = at + direction
    if (at < 0 || target < 0 || target >= enabled.length) return
    const next = [...enabled]
    ;[next[at], next[target]] = [next[target], next[at]]
    save(next)
  }

  const albumsQuery = useInfiniteQuery({
    queryKey: ['sona-mobile-library-newest', username],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => subsonic.albums.getAlbumList({
      type: 'newest', size: albumPageSize, offset: pageParam,
    }),
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.list?.length === albumPageSize ? lastPageParam + albumPageSize : undefined,
    staleTime: 60000,
  })
  const albums = useMemo(() => albumsQuery.data?.pages.flatMap(page => page.list ?? []) ?? [], [albumsQuery.data])

  useEffect(() => {
    const marker = loadMoreMarker.current
    if (!marker || !albumsQuery.hasNextPage) return
    const scrollRoot = getMainScrollElement()
    const observer = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting && !albumsQuery.isFetchingNextPage) {
        void albumsQuery.fetchNextPage()
      }
    }, { root: scrollRoot, rootMargin: '420px 0px' })
    observer.observe(marker)
    return () => observer.disconnect()
  }, [albumsQuery.fetchNextPage, albumsQuery.hasNextPage, albumsQuery.isFetchingNextPage, albums.length])

  return (
    <section className="sona-apple-library" aria-label="Your music library">
      <div className="sona-apple-library-top">
        <h1>Library</h1>
        <button type="button" className="sona-apple-library-more"
          aria-label="Edit library sections" aria-expanded={editing}
          onClick={() => setEditing(true)}><Ellipsis size={23} strokeWidth={2.7}/></button>
      </div>

      <nav className="sona-apple-library-sections" aria-label="Library sections">
        {enabled.map(id => {
          const item = sections.find(section => section.id === id)
          if (!item) return null
          const Icon = item.icon
          return (
            <Link key={item.id} to={item.href} className="sona-apple-library-row">
              <Icon className="sona-apple-library-row-icon" size={24} strokeWidth={1.8}/>
              <span>{item.name}</span>
              <ChevronRight className="sona-apple-library-chevron" size={20} strokeWidth={1.6}/>
            </Link>
          )
        })}
      </nav>

      <div className="sona-apple-library-divider" />
      <div className="sona-apple-library-albums-title">
        <h2>Recently Added</h2>
        <Link to={ROUTES.ALBUMS.RECENTLY_ADDED} aria-label="See all recently added albums">
          <ChevronRight size={22}/>
        </Link>
      </div>
      {albumsQuery.isError ? (
        <div className="sona-apple-library-state" role="alert">
          Albums couldn't be loaded.
          <button type="button" onClick={() => void albumsQuery.refetch()}>Retry</button>
        </div>
      ) : (
        <div className="sona-apple-library-grid">
          {albums.map(album => (
            <Link key={album.id} to={ROUTES.ALBUM.PAGE(album.id)}
              className="sona-apple-library-album"
              onClick={event => {
                if (window.innerWidth >= 768 || event.defaultPrevented) return
                event.preventDefault()
                openSonaAlbumFromCover(event, navigate, album.id)
              }}>
              <div className="sona-apple-library-album-cover" data-sona-album-id={album.id}>
                <ImageLoader id={album.coverArt} type="album" size={360}>
                  {src => <ArtworkImage src={src} alt={album.name} loading="lazy" />}
                </ImageLoader>
              </div>
              <span className="sona-apple-library-album-name">{album.name}</span>
              <span className="sona-apple-library-album-artist">{album.artist}</span>
            </Link>
          ))}
          {albumsQuery.isPending && Array.from({length:6}, (_,i) => (
            <div className="sona-apple-library-skeleton" key={i} aria-hidden="true">
              <div/><span/><span/>
            </div>
          ))}
        </div>
      )}
      {!albumsQuery.isPending && !albumsQuery.isError && albums.length === 0 &&
        <p className="sona-apple-library-state">Your albums will appear here once your library is ready.</p>}
      <div ref={loadMoreMarker} className="sona-apple-library-load-marker" aria-hidden="true" />
      {albumsQuery.isFetchingNextPage && <p className="sona-apple-library-loading">Loading more albums…</p>}

      {editing && createPortal(
        <div className="sona-library-editor-backdrop" onClick={() => setEditing(false)}>
          <div className="sona-library-editor" role="dialog" aria-modal="true"
            aria-label="Edit library sections" onClick={event => event.stopPropagation()}>
            <header>
              <div><strong>Customize Library</strong><p>Choose and arrange your sections.</p></div>
              <button type="button" aria-label="Done editing" onClick={() => setEditing(false)}><X size={21}/></button>
            </header>
            <div className="sona-library-editor-list">
              {sections.map(section => {
                const active = enabled.includes(section.id)
                const at = enabled.indexOf(section.id)
                return <div className="sona-library-editor-row" key={section.id}>
                  <button type="button" className="sona-library-editor-toggle"
                    onClick={() => toggle(section.id)} aria-pressed={active}
                    aria-label={(active ? 'Remove ' : 'Add ') + section.name}>
                    <span className={active ? 'is-enabled' : ''}>{active && <Check size={15} strokeWidth={3}/>}</span>
                    {section.name}
                  </button>
                  {active && <div className="sona-library-editor-order">
                    <button type="button" aria-label={'Move '+section.name+' up'}
                      disabled={at <= 0} onClick={() => move(section.id,-1)}><ArrowUp size={18}/></button>
                    <button type="button" aria-label={'Move '+section.name+' down'}
                      disabled={at === enabled.length-1} onClick={() => move(section.id,1)}><ArrowDown size={18}/></button>
                  </div>}
                </div>
              })}
            </div>
            <button className="sona-library-editor-done" type="button" onClick={() => setEditing(false)}>Done</button>
          </div>
        </div>, document.body)}
    </section>
  )
}
