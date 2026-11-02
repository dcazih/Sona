import './playing-bars.css'
import { usePlayerStore } from '@/store/player.store'
import { Play } from 'lucide-react'
export function PlayingBars({ size = 20 }: { size?: number }) {
  const playing = usePlayerStore(state => state.playerState.isPlaying)
  return <span data-playing={playing} className="sona-playing-bars" style={{ width: size, height: size }} aria-label="Playing" role="img">
    <i /><i /><i /><i />
  </span>
}

export function PlaybackIndicator({ active, size = 18 }: { active: boolean; size?: number }) {
  return <span className={'sona-playback-indicator' + (active ? ' is-active' : '')}>
    <Play size={size} fill="currentColor"/><PlayingBars size={size}/>
  </span>
}
