import { isStandalonePwa } from '@/utils/is-standalone-pwa'
import { Airplay, ListMusic } from 'lucide-react'
import { SonaNoteGlyph } from '@/app/components/header/sona-note-glyph'
import { type TouchEvent, useEffect, useRef, useState } from 'react'
import { ArtworkImage } from '@/app/components/artwork-image'
import { ImageLoader } from '@/app/components/image-loader'
import { SonaMobileTransport } from '@/app/components/sona/mobile-transport'
import { LikeButton } from '@/app/components/fullscreen/like-button'
import { LyricsTab } from '@/app/components/fullscreen/lyrics'
import { SonaMobileProgress } from '@/app/components/sona/mobile-progress'
import { SonaMobileVolume } from '@/app/components/sona/mobile-volume'
import { SonaMobileQueue } from '@/app/components/sona/mobile-queue'
import { usePlayerSheetMotion } from '@/app/hooks/use-player-sheet-motion'
import './player-sheet.css'
import { useSonaAmbient } from '@/app/hooks/use-sona-ambient'
import { Link } from 'react-router-dom'
import { ROUTES } from '@/routes/routesList'
import {
  usePlayerActions,
  usePlayerCurrentSong,
  usePlayerFullscreen,
  usePlayerRef,
  usePlayerIsPlaying,
} from '@/store/player.store'

type View = 'playing' | 'lyrics' | 'queue'
type Gesture = {
  id: number
  x: number
  y: number
  previousY: number
  time: number
  velocity: number
  axis: 'x' | 'y' | null
  base: number
  notchRestored: boolean
}

export function SonaMobileNowPlaying() {
  const { isFullscreen, setIsFullscreen } = usePlayerFullscreen()
  const song = usePlayerCurrentSong()
  const playing = usePlayerIsPlaying()
  const ambientStyle = useSonaAmbient()
  const audioRef = usePlayerRef()
  const { playPrevSong, playNextSong } = usePlayerActions()
  const [view, setView] = useState<View>('playing')
  const [supportsAirplay, setSupportsAirplay] = useState(false)
  const motion = usePlayerSheetMotion(isFullscreen, () => setView('playing'))
  const gesture = useRef<Gesture | null>(null)
  const suppressClick = useRef(false)
  const artTouchX = useRef<number | null>(null)

  useEffect(() => {
    setSupportsAirplay(
      Boolean(
        (
          audioRef as
            | (HTMLAudioElement & {
                webkitShowPlaybackTargetPicker?: () => void
              })
            | null
        )?.webkitShowPlaybackTargetPicker,
      ),
    )
  }, [audioRef, isFullscreen])

  const underlyingNotchColor = () => {
    const root = document.documentElement
    return (
      root.style.getPropertyValue('--sona-album-notch-color') ||
      root.style.getPropertyValue('--sona-tab-notch-color') ||
      '#000000'
    )
  }

  function applyPlayerNotch() {
    if (isStandalonePwa()) return
    const root = document.documentElement
    const color = String(
      (ambientStyle as Record<string, string>)['--sona-ambient-color'] ||
        '#755265',
    )
    const channels = /^#[0-9a-f]{6}$/i.test(color)
      ? [0, 2, 4].map((i) => parseInt(color.slice(i + 1, i + 3), 16))
      : [117, 82, 101]
    const tint =
      '#' +
      channels
        .map((v, i) =>
          Math.round(v * 0.72 + [25, 24, 29][i] * 0.28)
            .toString(16)
            .padStart(2, '0'),
        )
        .join('')
    root.dataset.sonaNotchOwner = 'player'
    root.style.setProperty('--sona-notch-color', tint)
    document
      .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
      ?.setAttribute('content', tint)
  }

  // The normal toolbar is intentionally never recolored. Now Playing owns the
  // notch only while open and gives it back synchronously on close/remount.
  useEffect(() => {
    if (window.innerWidth >= 768 || isStandalonePwa()) return
    const root = document.documentElement
    const meta = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]',
    )
    if (isFullscreen) {
      if (motion.ref.current?.dataset.phase !== 'dragging') applyPlayerNotch()
      return
    }
    if (root.dataset.sonaNotchOwner !== 'player') return
    const restore = underlyingNotchColor()
    root.style.setProperty('--sona-notch-color', restore)
    meta?.setAttribute('content', restore)
    delete root.dataset.sonaNotchOwner
  }, [isFullscreen, ambientStyle])

  useEffect(
    () => () => {
      if (isStandalonePwa()) return
      const root = document.documentElement
      if (root.dataset.sonaNotchOwner !== 'player') return
      const restore = underlyingNotchColor()
      root.style.setProperty('--sona-notch-color', restore)
      document
        .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
        ?.setAttribute('content', restore)
      delete root.dataset.sonaNotchOwner
    },
    [],
  )

  function restoreNotchImmediately() {
    if (isStandalonePwa()) return
    const root = document.documentElement
    const restore = underlyingNotchColor()
    root.style.setProperty('--sona-notch-color', restore)
    document
      .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
      ?.setAttribute('content', restore)
    delete root.dataset.sonaNotchOwner
  }

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

  function beginSwipe(event: globalThis.PointerEvent) {
    if (
      !isFullscreen ||
      motion.ref.current?.dataset.phase !== 'open' ||
      !event.isPrimary ||
      event.button !== 0
    )
      return
    if (
      (event.target as Element).closest(
        '.sona-queue-scroller, .sona-now-lyrics, .sona-mobile-scrubber, .sona-volume-slider, [role="slider"], input, button:not(.sona-now-drag-handle), a',
      )
    )
      return
    suppressClick.current = false
    gesture.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      previousY: event.clientY,
      time: performance.now(),
      velocity: 0,
      axis: null,
      base: 0,
      notchRestored: false,
    }
  }

  function moveSwipe(event: globalThis.PointerEvent) {
    const start = gesture.current
    if (!start || event.pointerId !== start.id) return
    const samples = event.getCoalescedEvents?.()
    const point = samples?.[samples.length - 1] || event
    const dx = point.clientX - start.x
    const dy = point.clientY - start.y
    if (dy > 0 && !start.notchRestored) {
      restoreNotchImmediately()
      start.notchRestored = true
    }
    if (!start.axis && Math.max(Math.abs(dx), Math.abs(dy)) > 4) {
      if (Math.abs(dy) >= Math.abs(dx) * 0.8) start.axis = 'y'
      else if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.5)
        start.axis = 'x'
      if (start.axis === 'y') {
        artTouchX.current = null
        motion.begin()
        start.base = motion.distance.current
        motion.ref.current?.setPointerCapture(event.pointerId)
      }
    }
    if (start.axis !== 'y') return
    suppressClick.current = true
    const now = performance.now()
    start.velocity =
      (point.clientY - start.previousY) / Math.max(1, now - start.time)
    start.previousY = point.clientY
    start.time = now
    // Follow every pixel, including the entire trip to the bottom. No resistance.
    motion.move(start.base + dy)
  }

  function endSwipe(event: globalThis.PointerEvent) {
    const start = gesture.current
    gesture.current = null
    if (!start || start.id !== event.pointerId || start.axis !== 'y') return
    motion.flush()
    const fast = performance.now() - start.time < 100 && start.velocity > 0.65
    if (
      motion.distance.current > 112 ||
      (fast && motion.distance.current > 30)
    ) {
      restoreNotchImmediately()
      setIsFullscreen(false)
    } else {
      motion.settle()
      applyPlayerNotch()
    }
  }

  function cancelSwipe() {
    const vertical = gesture.current?.axis === 'y'
    gesture.current = null
    if (vertical && isFullscreen) {
      motion.flush()
      motion.settle()
      applyPlayerNotch()
    }
  }

  function endArtworkSwipe(event: TouchEvent<HTMLDivElement>) {
    if (artTouchX.current === null) return
    const distance = event.changedTouches[0].clientX - artTouchX.current
    if (Math.abs(distance) > 85 && gesture.current?.axis !== 'y') {
      if (distance < 0) playNextSong()
      else playPrevSong()
    }
    artTouchX.current = null
  }

  const pointerHandlers = useRef({
    beginSwipe,
    moveSwipe,
    endSwipe,
    cancelSwipe,
  })
  pointerHandlers.current = { beginSwipe, moveSwipe, endSwipe, cancelSwipe }
  useEffect(() => {
    const sheet = motion.ref.current
    if (!sheet) return
    const down = (event: globalThis.PointerEvent) =>
      pointerHandlers.current.beginSwipe(event)
    const move = (event: globalThis.PointerEvent) =>
      pointerHandlers.current.moveSwipe(event)
    const up = (event: globalThis.PointerEvent) =>
      pointerHandlers.current.endSwipe(event)
    const cancel = () => pointerHandlers.current.cancelSwipe()
    const lost = (event: globalThis.PointerEvent) => {
      if (event.target === sheet && gesture.current?.id === event.pointerId)
        cancel()
    }
    sheet.addEventListener('pointerdown', down, { passive: true })
    sheet.addEventListener('pointermove', move, { passive: true })
    sheet.addEventListener('pointerup', up, { passive: true })
    sheet.addEventListener('pointercancel', cancel)
    sheet.addEventListener('lostpointercapture', lost)
    return () => {
      sheet.removeEventListener('pointerdown', down)
      sheet.removeEventListener('pointermove', move)
      sheet.removeEventListener('pointerup', up)
      sheet.removeEventListener('pointercancel', cancel)
      sheet.removeEventListener('lostpointercapture', lost)
    }
  }, [])

  return (
    <>
      <div
        ref={motion.ref}
        className={'sona-now-overlay ' + (isFullscreen ? 'is-open' : '')}
        role="dialog"
        aria-modal={isFullscreen ? 'true' : undefined}
        aria-hidden={!isFullscreen}
        aria-label="Now Playing"
        onClickCapture={(event) => {
          if (!suppressClick.current) return
          suppressClick.current = false
          event.preventDefault()
          event.stopPropagation()
        }}
        style={ambientStyle}
      >
        <div className="sona-now-glass" />
        <div className="sona-now-background" />
        <div className="sona-now-content">
          <div className="sona-now-top">
            <button
              className="sona-now-drag-handle"
              type="button"
              aria-label="Minimize Now Playing"
              onClick={() => setIsFullscreen(false)}
            >
              <span className="sona-now-drag-capsule" aria-hidden="true" />
            </button>
          </div>

          <div className="sona-now-stage">
            {view === 'playing' && (
              <div
                className="sona-now-art-area"
                onTouchStart={(event) => {
                  artTouchX.current = event.touches[0].clientX
                }}
                onTouchEnd={endArtworkSwipe}
              >
                <div
                  className={'sona-now-art' + (playing ? ' is-playing' : '')}
                >
                  <div className="sona-now-art-content">
                    {
                      <ImageLoader id={song?.coverArt} type="song" size={800}>
                        {(src) => (
                          <ArtworkImage
                            src={src}
                            alt={song?.title || 'Album artwork'}
                          />
                        )}
                      </ImageLoader>
                    }
                  </div>
                </div>
              </div>
            )}
            {view === 'lyrics' && (
              <div className="sona-now-lyrics">
                <LyricsTab />
              </div>
            )}
            {view === 'queue' && <SonaMobileQueue />}
          </div>

          <div className="sona-now-panel">
            <div className="sona-now-song-info">
              <div className="sona-now-song-text">
                <h2>{song?.title || 'Nothing playing'}</h2>
                {song?.artistId ? (
                  <Link
                    className="sona-now-artist-link"
                    to={ROUTES.ARTIST.PAGE(song.artistId)}
                    onClick={() => setIsFullscreen(false)}
                  >
                    {song.artist}
                  </Link>
                ) : (
                  <p>{song?.artist || ''}</p>
                )}
              </div>
              <LikeButton />
            </div>
            <div className="sona-now-control-stack">
              <div className="sona-now-progress">
                <SonaMobileProgress />
              </div>
              <div className="sona-now-transport">
                <SonaMobileTransport />
              </div>
              <div className="sona-now-volume">
                <SonaMobileVolume />
              </div>
            </div>
            <div className="sona-now-bottom-actions">
              <button
                type="button"
                aria-label="Show lyrics"
                aria-pressed={view === 'lyrics'}
                className={view === 'lyrics' ? 'is-selected' : ''}
                onClick={() =>
                  setView(view === 'lyrics' ? 'playing' : 'lyrics')
                }
              >
                <SonaNoteGlyph size={22} />
              </button>
              <button
                type="button"
                aria-label="Choose AirPlay output"
                disabled={!supportsAirplay}
                onClick={() =>
                  (
                    audioRef as
                      | (HTMLAudioElement & {
                          webkitShowPlaybackTargetPicker?: () => void
                        })
                      | null
                  )?.webkitShowPlaybackTargetPicker?.()
                }
              >
                <Airplay size={22} />
              </button>
              <button
                type="button"
                aria-label="Show song queue"
                aria-pressed={view === 'queue'}
                className={view === 'queue' ? 'is-selected' : ''}
                onClick={() => setView(view === 'queue' ? 'playing' : 'queue')}
              >
                <ListMusic size={22} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
