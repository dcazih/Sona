import { ChevronDown, ListMusic, Music2 } from 'lucide-react'
import { type CSSProperties, type TouchEvent, useEffect, useRef, useState } from 'react'
import { ImageLoader } from '@/app/components/image-loader'
import { FullscreenControls } from '@/app/components/fullscreen/controls'
import { LikeButton } from '@/app/components/fullscreen/like-button'
import { LyricsTab } from '@/app/components/fullscreen/lyrics'
import { SonaMobileProgress } from '@/app/components/sona/mobile-progress'
import { VolumeContainer } from '@/app/components/fullscreen/volume-container'
import { SonaMobileQueue } from '@/app/components/sona/mobile-queue'
import { useSonaAmbient } from '@/app/hooks/use-sona-ambient'
import {
  usePlayerActions,
  usePlayerCurrentSong,
  usePlayerFullscreen,
} from '@/store/player.store'

type View = 'playing' | 'lyrics' | 'queue'
type Gesture = { x: number; y: number }

export function SonaMobileNowPlaying() {
  const { isFullscreen, setIsFullscreen } = usePlayerFullscreen()
  const song = usePlayerCurrentSong()
  const ambientStyle = useSonaAmbient()
  const { playPrevSong, playNextSong } = usePlayerActions()
  const [view, setView] = useState<View>('playing')
  const [dragY, setDragY] = useState(0)
  const lastDrag = useRef(0)
  const gesture = useRef<Gesture | null>(null)
  const artTouchX = useRef<number | null>(null)

  useEffect(() => {
    if (!isFullscreen) {
      setView('playing')
      setDragY(0)
      lastDrag.current = 0
    }
  }, [isFullscreen])

  useEffect(() => {
    if (!isFullscreen) return
    const previousOverflow = document.body.style.overflow
    const previousOverscroll = document.body.style.overscrollBehaviorY
    document.body.style.overflow = 'hidden'
    document.body.style.overscrollBehaviorY = 'none'
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsFullscreen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.overscrollBehaviorY = previousOverscroll
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [isFullscreen, setIsFullscreen])

  function beginSwipe(event: TouchEvent<HTMLElement>) {
    if (!isFullscreen) return
    if ((event.target as Element).closest('.sona-queue-scroller, .sona-now-lyrics, [role="slider"], input')) return
    gesture.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }
  }

  function moveSwipe(event: TouchEvent<HTMLElement>) {
    const start = gesture.current
    if (!start) return
    const dx = event.touches[0].clientX - start.x
    const dy = event.touches[0].clientY - start.y
    if (dy > 0 && dy > Math.abs(dx) * 1.15) {
      // Progressive resistance keeps the drawer attached to the fingertip
      // while avoiding a sudden snap near the bottom of the screen.
      const travel = Math.min(dy, window.innerHeight)
      const resistance = 1 - 0.24 * Math.min(1, travel / window.innerHeight)
      const offset = travel * resistance
      lastDrag.current = offset
      setDragY(offset)
      if (event.cancelable) event.preventDefault()
    } else if (lastDrag.current !== 0 && dy <= 0) {
      lastDrag.current = 0
      setDragY(0)
    }
  }

  function endSwipe(event: TouchEvent<HTMLElement>) {
    const start = gesture.current
    gesture.current = null
    if (!start) return
    const dx = event.changedTouches[0].clientX - start.x
    const dy = event.changedTouches[0].clientY - start.y
    lastDrag.current = 0
    setDragY(0)
    if (dy > 112 && dy > Math.abs(dx) * 1.15) {
      setIsFullscreen(false)
    }
  }

  function endArtworkSwipe(event: TouchEvent<HTMLDivElement>) {
    if (artTouchX.current === null) return
    const distance = event.changedTouches[0].clientX - artTouchX.current
    if (Math.abs(distance) > 85 && dragY === 0) {
      if (distance < 0) playNextSong()
      else playPrevSong()
    }
    artTouchX.current = null
  }

  return (
    <div
      className={'sona-now-overlay ' + (isFullscreen ? 'is-open' : '') + (dragY > 0 ? ' is-dragging' : '')}
      role="dialog"
      aria-modal={isFullscreen ? 'true' : undefined}
      aria-hidden={!isFullscreen}
      aria-label="Now Playing"
      style={{
        ...ambientStyle,
        '--sona-drag-y': String(dragY) + 'px',
        '--sona-drag-progress': String(Math.min(1, dragY / 310)),
      } as CSSProperties}
    >
      <div className="sona-now-background" />
      <div className="sona-now-top" onTouchStart={beginSwipe} onTouchMove={moveSwipe} onTouchEnd={endSwipe}>
        <span className="sona-now-drag-capsule" aria-hidden="true" />
        <button className="sona-now-dismiss" type="button" aria-label="Close Now Playing"
          onClick={() => setIsFullscreen(false)}>
          <ChevronDown size={29} strokeWidth={1.7} />
        </button>
        <span className="sona-now-label">NOW PLAYING</span>
        <span className="sona-now-top-empty" aria-hidden="true" />
      </div>

      <div className="sona-now-stage" onTouchStart={beginSwipe} onTouchMove={moveSwipe} onTouchEnd={endSwipe}>
        {view === 'playing' && (
          <div className="sona-now-art-area"
            onTouchStart={(event) => { artTouchX.current = event.touches[0].clientX }}
            onTouchEnd={endArtworkSwipe}>
            <div className="sona-now-art">
              {song?.coverArt ? (
                <ImageLoader id={song.coverArt} type="song" size={800}>
                  {(src) => <img src={src} alt={song.title || 'Album artwork'} />}
                </ImageLoader>
              ) : <Music2 size={76} strokeWidth={1} />}
            </div>
          </div>
        )}
        {view === 'lyrics' && <div className="sona-now-lyrics"><LyricsTab /></div>}
        {view === 'queue' && <SonaMobileQueue />}
      </div>

      <div className="sona-now-panel">
        <div className="sona-now-song-info">
          <div className="sona-now-song-text">
            <h2>{song?.title || 'Nothing playing'}</h2>
            <p>{song?.artist || ''}</p>
          </div>
          <LikeButton />
        </div>
        <div className="sona-now-progress"><SonaMobileProgress /></div>
        <div className="sona-now-transport"><FullscreenControls /></div>
        <div className="sona-now-bottom-actions">
          <button type="button" aria-label="Show lyrics" aria-pressed={view === 'lyrics'}
            className={view === 'lyrics' ? 'is-selected' : ''}
            onClick={() => setView(view === 'lyrics' ? 'playing' : 'lyrics')}
          ><Music2 size={21} /> <span>Lyrics</span></button>
          <div className="sona-now-volume"><VolumeContainer /></div>
          <button type="button" aria-label="Show song queue" aria-pressed={view === 'queue'}
            className={view === 'queue' ? 'is-selected' : ''}
            onClick={() => setView(view === 'queue' ? 'playing' : 'queue')}
          ><ListMusic size={21} /><span>Up Next</span></button>
        </div>
      </div>
    </div>
  )
}
