import { useInfiniteQuery } from '@tanstack/react-query'
import { Check, ChevronRight, GripVertical, Heart, ListMusic, Mic2, Music2, Podcast, Radio, Tags, Disc3 } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
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
  const [collapsing, setCollapsing] = useState(false)
  const [draftOrder, setDraftOrder] = useState<SectionId[]>(() => sections.map(section => section.id))
  const [draftIncluded, setDraftIncluded] = useState<SectionId[]>(() => readSections(username))
  const [dragging, setDragging] = useState<SectionId | null>(null)
  const [dragOffset, setDragOffset] = useState(0)
  const dragRef = useRef<{ id: SectionId; pointer: number; y: number } | null>(null)
  const rowsRef = useRef<HTMLDivElement>(null)
  const positionsRef = useRef<Map<SectionId, number>>(new Map())
  const saveTimer = useRef<number | null>(null)
  const loadMoreMarker = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const next = readSections(username)
    setEnabled(next)
    setDraftIncluded(next)
    setDraftOrder([...next, ...sections.map(section => section.id).filter(id => !next.includes(id))])
    setEditing(false)
  }, [username])

  const startEditing = () => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    setDraftIncluded([...enabled])
    setDraftOrder([...enabled, ...sections.map(section => section.id).filter(id => !enabled.includes(id))])
    setCollapsing(false)
    setEditing(true)
    window.dispatchEvent(new CustomEvent('sona:library-edit-state', { detail: true }))
  }

  const saveEditing = () => {
    if (!editing || collapsing) return
    const next = draftOrder.filter(id => draftIncluded.includes(id))
    setEnabled(next)
    try { window.localStorage.setItem(storageKey(username), JSON.stringify(next)) }
    catch { /* Browser may block storage. */ }
    setDragging(null)
    setDragOffset(0)
    setCollapsing(true)
    saveTimer.current = window.setTimeout(() => {
      setEditing(false)
      setCollapsing(false)
      window.dispatchEvent(new CustomEvent('sona:library-edit-state', { detail: false }))
      saveTimer.current = null
    }, 330)
  }

  useEffect(() => {
    const handle = (event: Event) => {
      const action = (event as CustomEvent<string>).detail
      if (action === 'start' && !editing) startEditing()
      if (action === 'save' && editing) saveEditing()
    }
    window.addEventListener('sona:library-edit-request', handle)
    return () => window.removeEventListener('sona:library-edit-request', handle)
  }, [editing, collapsing, enabled, draftOrder, draftIncluded, username])

  useEffect(() => () => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    window.dispatchEvent(new CustomEvent('sona:library-edit-state', { detail: false }))
  }, [])

  const toggleIncluded = (id: SectionId) => {
    setDraftIncluded(current => current.includes(id)
      ? current.filter(item => item !== id)
      : [...current, id])
  }

  const dragStart = (event: ReactPointerEvent<HTMLButtonElement>, id: SectionId) => {
    if (!editing || collapsing || !event.isPrimary) return
    dragRef.current = { id, pointer: event.pointerId, y: event.clientY }
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging(id)
    setDragOffset(0)
    event.preventDefault()
  }
  const dragMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointer !== event.pointerId) return
    const dy = event.clientY - drag.y
    setDragOffset(dy)
    const rows = Array.from(rowsRef.current?.querySelectorAll<HTMLElement>('[data-sona-section]') ?? [])
    const target = rows.find(row => {
      const rect = row.getBoundingClientRect()
      return event.clientY >= rect.top && event.clientY <= rect.bottom
    })
    const targetId = target?.dataset.sonaSection as SectionId | undefined
    if (targetId && targetId !== drag.id) {
      setDraftOrder(order => {
        const from = order.indexOf(drag.id)
        const to = order.indexOf(targetId)
        if (from < 0 || to < 0 || from === to) return order
        const result = [...order]
        result.splice(from,1)
        result.splice(to,0,drag.id)
        return result
      })
      drag.y = event.clientY
      setDragOffset(0)
    }
  }
  const dragEnd = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current || dragRef.current.pointer !== event.pointerId) return
    dragRef.current = null
    setDragging(null)
    setDragOffset(0)
  }

  useLayoutEffect(() => {
    const parent = rowsRef.current
    if (!parent || !editing) return
    const next = new Map<SectionId, number>()
    for (const row of parent.querySelectorAll<HTMLElement>('[data-sona-section]')) {
      const id = row.dataset.sonaSection as SectionId
      const y = row.getBoundingClientRect().top
      const last = positionsRef.current.get(id)
      if (last !== undefined && Math.abs(last - y) > 3 && dragging !== id && !collapsing) {
        row.animate([{transform:`translateY(${last-y}px)`}, {transform:'translateY(0)'}],
          {duration:200,easing:'cubic-bezier(.2,.8,.2,1)'})
      }
      next.set(id,y)
    }
    positionsRef.current = next
  }, [draftOrder, editing, collapsing, dragging])

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
      <nav ref={rowsRef} className={'sona-apple-library-sections'
        + (editing ? ' is-editing' : '') + (collapsing ? ' is-collapsing' : '')}
        aria-label="Library sections">
        {(editing ? draftOrder : enabled).map(id => {
          const item = sections.find(section => section.id === id)
          if (!item) return null
          const Icon = item.icon
          const included = editing ? draftIncluded.includes(id) : true
          return (
            <div key={id} data-sona-section={id}
              className={'sona-apple-library-row-wrap' + (!included ? ' is-excluded' : '') +
                (dragging === id ? ' is-dragging' : '')}
              style={dragging === id ? { transform: `translateY(${dragOffset}px)` } : undefined}>
              {editing ? (
                <div className="sona-apple-library-row is-editable">
                  <button type="button" className="sona-apple-library-include"
                    aria-label={(included ? 'Exclude ' : 'Include ') + item.name}
                    aria-pressed={included} onClick={() => toggleIncluded(id)}>
                    <span className={included ? 'is-included' : ''}>
                      {included && <Check size={15} strokeWidth={3}/>}
                    </span>
                  </button>
                  <Icon className="sona-apple-library-row-icon" size={24} strokeWidth={1.8}/>
                  <span className="sona-apple-library-row-label">{item.name}</span>
                  <button type="button" className="sona-apple-library-drag-handle"
                    aria-label={'Drag to reorder '+item.name}
                    onPointerDown={event => dragStart(event,id)}
                    onPointerMove={dragMove} onPointerUp={dragEnd} onPointerCancel={dragEnd}>
                    <GripVertical size={24} strokeWidth={2}/>
                  </button>
                </div>
              ) : (
                <Link to={item.href} className="sona-apple-library-row">
                  <Icon className="sona-apple-library-row-icon" size={24} strokeWidth={1.8}/>
                  <span>{item.name}</span>
                  <ChevronRight className="sona-apple-library-chevron" size={20} strokeWidth={1.6}/>
                </Link>
              )}
            </div>
          )
        })}
      </nav>
      <div className="sona-apple-library-albums-title">
        <h2>Recently Added</h2>
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


    </section>
  )
}
