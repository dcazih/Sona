import { ChevronDown, ListMusic, ListMusicIcon, Music2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ImageLoader } from '@/app/components/image-loader'
import { FullscreenControls } from '@/app/components/fullscreen/controls'
import { LikeButton } from '@/app/components/fullscreen/like-button'
import { LyricsTab } from '@/app/components/fullscreen/lyrics'
import { FullscreenProgress } from '@/app/components/fullscreen/progress'
import { VolumeContainer } from '@/app/components/fullscreen/volume-container'
import { SonaMobileQueue } from '@/app/components/sona/mobile-queue'
import {
  usePlayerActions,
  usePlayerCurrentSong,
  usePlayerFullscreen,
  usePlayerSonglist,
} from '@/store/player.store'

type View = 'playing' | 'lyrics' | 'queue'

export function SonaMobileNowPlaying() {
  const { isFullscreen, setIsFullscreen } = usePlayerFullscreen()
  const song = usePlayerCurrentSong()
  const { currentList } = usePlayerSonglist()
  const { playPrevSong, playNextSong } = usePlayerActions()
  const [view, setView] = useState<View>('playing')
  const touch = useRef<number | null>(null)
  const grab = useRef<number | null>(null)

  useEffect(() => {
    if (!isFullscreen) setView('playing')
  }, [isFullscreen])

  useEffect(() => {
    if (!isFullscreen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsFullscreen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isFullscreen, setIsFullscreen])

  if (!isFullscreen) return null

  function endArtworkSwipe(event: React.TouchEvent<HTMLDivElement>) {
    if (touch.current === null) return
    const distance = event.changedTouches[0].clientX - touch.current
    if (Math.abs(distance) > 85) {
      if (distance < 0) playNextSong()
      else playPrevSong()
    }
    touch.current = null
  }

  return (
    <div className="sona-now-overlay" role="dialog" aria-modal="true" aria-label="Now Playing">
      <div className="sona-now-background" />
      <div className="sona-now-top">
        <button
          className="sona-now-dismiss" type="button" aria-label="Close Now Playing"
          onClick={() => setIsFullscreen(false)}
          onPointerDown={(event) => { grab.current = event.clientY }}
          onPointerUp={(event) => {
            if (grab.current !== null && event.clientY - grab.current > 75) setIsFullscreen(false)
            grab.current = null
          }}
        ><ChevronDown size={29} strokeWidth={1.7} /></button>
        <span className="sona-now-label">NOW PLAYING</span>
        <span className="sona-now-top-empty" aria-hidden="true" />
      </div>

      <div className="sona-now-stage">
        {view === 'playing' && (
          <div
            className="sona-now-art-area"
            onTouchStart={(event) => { touch.current = event.touches[0].clientX }}
            onTouchEnd={endArtworkSwipe}
          >
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
        <div className="sona-now-progress"><FullscreenProgress /></div>
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
