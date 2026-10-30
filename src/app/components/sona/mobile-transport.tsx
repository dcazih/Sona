import { Pause, Play, SkipBack, SkipForward } from 'lucide-react'
import { usePlayerActions, usePlayerIsPlaying, usePlayerPrevAndNext } from '@/store/player.store'

/** Only the icon morphs on playback transitions; no sticky mobile hover scaling. */
export function SonaMobileTransport() {
  const playing = usePlayerIsPlaying()
  const { hasPrev, hasNext } = usePlayerPrevAndNext()
  const { playPrevSong, playNextSong, togglePlayPause } = usePlayerActions()

  return (
    <div className="sona-transport" role="group" aria-label="Playback controls">
      <button className="sona-transport-skip" type="button" aria-label="Previous track"
        disabled={!hasPrev} onClick={() => playPrevSong()}>
        <SkipBack fill="currentColor" strokeWidth={1.6} />
      </button>
      <button className="sona-transport-toggle" type="button"
        aria-label={playing ? 'Pause' : 'Play'} onClick={() => togglePlayPause()}>
        <span className={'sona-transport-icon sona-play-icon' + (!playing ? ' is-visible' : '')}>
          <Play fill="currentColor" strokeWidth={1.4} />
        </span>
        <span className={'sona-transport-icon sona-pause-icon' + (playing ? ' is-visible' : '')}>
          <Pause fill="currentColor" strokeWidth={1.4} />
        </span>
      </button>
      <button className="sona-transport-skip" type="button" aria-label="Next track"
        disabled={!hasNext} onClick={() => playNextSong()}>
        <SkipForward fill="currentColor" strokeWidth={1.6} />
      </button>
    </div>
  )
}
