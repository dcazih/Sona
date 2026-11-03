import { PlayerCompactHeader, PlayerSongMore } from './player-song-header'
import { usePlaybackHistory } from './playback-history'
import { subsonic } from '@/service/subsonic'
import { isStandalonePwa } from '@/utils/is-standalone-pwa'
import { useAppStore } from '@/store/app.store'
import { recordGenreListen } from './search-discovery'
import { Airplay, ListMusic } from 'lucide-react'
import { SonaNoteGlyph } from '@/app/components/header/sona-note-glyph'
import { type TouchEvent, useEffect, useLayoutEffect, useRef, useState } from 'react'
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
  usePlayerStore,
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
  const discoveryProfile = useAppStore(state=>state.data.url+'|'+state.data.username)
  const playing = usePlayerIsPlaying()
  const ambientStyle = useSonaAmbient()
  const audioRef = usePlayerRef()
  const { playPrevSong, playNextSong } = usePlayerActions()
  const [view, setView] = useState<View>('playing')
  const [supportsAirplay, setSupportsAirplay] = useState(false)
  const motion = usePlayerSheetMotion(isFullscreen)
  const lastRecorded = useRef('')
  const modeCleanup = useRef<() => void>(()=>{})
  const modeFlight = useRef<HTMLElement | null>(null)
  const autoplay = usePlaybackHistory(state=>state.autoplay)
  const record = usePlaybackHistory(state=>state.record)
  useEffect(()=>{
    if(playing && song?.id && lastRecorded.current!==discoveryProfile+'|'+song.id){
      lastRecorded.current=discoveryProfile+'|'+song.id
      record(discoveryProfile,song)
    }
  },[song,playing,discoveryProfile,record])
  useEffect(()=>{
    if(!autoplay || !playing || !song?.id)return
    const state=usePlayerStore.getState()
    if(state.songlist.currentSongIndex<state.songlist.currentList.length-2)return
    let cancelled=false
    void subsonic.songs.getRandomSongs({size:20,genre:song.genre}).then(songs=>{
      if(cancelled || !songs?.length || !usePlaybackHistory.getState().autoplay)return
      const now=usePlayerStore.getState()
      if(now.songlist.currentSong.id===song.id && now.playerState.isPlaying)now.actions.setLastOnQueue(songs)
    })
    return()=>{cancelled=true}
  },[autoplay,playing,song?.id,song?.genre])
  useEffect(()=>()=>modeCleanup.current(),[])
  useLayoutEffect(()=>{if(!isFullscreen)modeCleanup.current()},[isFullscreen])
  function changeView(next:View){
    const sheet=motion.ref.current,art=modeFlight.current || sheet?.querySelector<HTMLElement>('[data-sona-active-player-cover]')
    const from=art?.getBoundingClientRect(),ghost=art?.cloneNode(true) as HTMLElement|undefined
    const fromRadius=art&&from?(parseFloat(getComputedStyle(art).borderTopLeftRadius)||0)*from.width/(art.offsetWidth||from.width):20
    modeCleanup.current()
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){setView(next);return}
    const extras:HTMLElement[]=[]
    if(view==='playing'){
      const info=sheet?.querySelector<HTMLElement>('.sona-now-song-info')
      if(info){const clone=info.cloneNode(true) as HTMLElement,rect=info.getBoundingClientRect();clone.className='sona-view-info-flight';clone.setAttribute('aria-hidden','true');clone.inert=true;Object.assign(clone.style,{position:'fixed',left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px',display:'flex',alignItems:'center',gap:'10px',zIndex:'253',pointerEvents:'none',color:'#fff'});document.body.appendChild(clone);extras.push(clone);clone.animate([{opacity:1,translate:'0 0'},{opacity:0,translate:'0 -12px'}],{duration:320,easing:'cubic-bezier(.22,.8,.22,1)',fill:'both'}).finished.then(()=>clone.remove()).catch(()=>{})}
    }
    setView(next)
    let frame=requestAnimationFrame(()=>{
      const target=motion.ref.current?.querySelector<HTMLElement>('[data-sona-active-player-cover]')
      if(!target||!from||!ghost)return
      const to=target.getBoundingClientRect(),radius=parseFloat(getComputedStyle(target).borderTopLeftRadius)||9
      ghost.className='sona-view-art-flight';ghost.setAttribute('aria-hidden','true');ghost.inert=true;ghost.removeAttribute('data-sona-active-player-cover')
      Object.assign(ghost.style,{position:'fixed',left:'0',top:'0',width:from.width+'px',height:from.height+'px',overflow:'hidden',zIndex:'254',pointerEvents:'none',transformOrigin:'0 0',borderRadius:fromRadius+'px',boxShadow:'0 12px 30px #0005'})
      const image=ghost.querySelector<HTMLImageElement>('img');if(image){ghost.style.backgroundImage=`url(${JSON.stringify(image.currentSrc||image.src)})`;ghost.style.backgroundSize='cover'}
      document.body.appendChild(ghost);modeFlight.current=ghost;target.style.visibility='hidden'
      const animation=ghost.animate([{transform:`translate3d(${from.left}px,${from.top}px,0) scale(1)`},{transform:`translate3d(${to.left}px,${to.top}px,0) scale(${to.width/from.width})`,borderRadius:radius/(to.width/from.width)+'px'}],{duration:420,easing:'cubic-bezier(.22,.8,.22,1)',fill:'both'})
      const cleanup=()=>{target.style.visibility='';ghost.remove();if(modeFlight.current===ghost)modeFlight.current=null;extras.forEach(node=>node.remove());animation.cancel()}
      modeCleanup.current=cleanup
      animation.finished.then(cleanup).catch(()=>{})
    })
    modeCleanup.current=()=>{cancelAnimationFrame(frame);ghost?.remove();extras.forEach(node=>node.remove())}
  }
  const gesture = useRef<Gesture | null>(null)
  const suppressClick = useRef(false)
  const artTouchX = useRef<number | null>(null)

  // Count a genre listen only after actual playback, not on browse or a skip.
  useEffect(()=>{
    const audio=audioRef as HTMLAudioElement | null
    if(!audio || !song?.id || !(song.genre || song.genres?.length))return
    let recorded=false
    const onTime=()=>{
      const threshold=Math.max(10,Math.min(25,(song.duration||80)/4))
      if(!recorded && !audio.paused && audio.currentTime>=threshold){
        recorded=true
        recordGenreListen(discoveryProfile,song)
      }
    }
    audio.addEventListener('timeupdate',onTime)
    return ()=>audio.removeEventListener('timeupdate',onTime)
  },[audioRef,song?.id,song?.genre,discoveryProfile])

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
    if (motion.ref.current?.dataset.phase !== 'open' && motion.ref.current?.dataset.phase !== 'dragging') {
      gesture.current = null
      return
    }
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
        if (!motion.begin()) {
          gesture.current = null
          return
        }
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
        data-view={view}
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
              <div
                className="sona-now-art-area"
                onTouchStart={(event) => {
                  artTouchX.current = event.touches[0].clientX
                }}
                onTouchEnd={endArtworkSwipe}
              >
                <div
                  className={'sona-now-art' + (playing ? ' is-playing' : '')}
                  data-sona-active-player-cover={view === 'playing' ? '' : undefined}
                >
                  <div className="sona-now-art-content">
                    {
                      <ImageLoader id={song?.coverArt} type="song" size={800}>
                        {(src) => (
                          <ArtworkImage
                            src={src}
                            crossOrigin="anonymous"
                            alt={song?.title || 'Album artwork'}
                          />
                        )}
                      </ImageLoader>
                    }
                  </div>
                </div>
              </div>
            {view === 'lyrics' && (
              <><PlayerCompactHeader/><div className="sona-now-lyrics"><LyricsTab /></div></>
            )}
            {view === 'queue' && <SonaMobileQueue header={<PlayerCompactHeader/>} open={isFullscreen}/>}
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
              <LikeButton /><PlayerSongMore/>
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
                  changeView(view === 'lyrics' ? 'playing' : 'lyrics')
                }
              >
                <SonaNoteGlyph size={27} />
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
                onClick={() => changeView(view === 'queue' ? 'playing' : 'queue')}
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
