import * as Slider from '@radix-ui/react-slider'
import { useState } from 'react'
import { usePlayerActions, usePlayerDuration, usePlayerProgress, usePlayerRef } from '@/store/player.store'
import { convertSecondsToTime } from '@/utils/convertSecondsToTime'

export function SonaMobileProgress() {
  const progress = usePlayerProgress()
  const duration = usePlayerDuration()
  const audio = usePlayerRef()
  const { setProgress } = usePlayerActions()
  const [seek, setSeek] = useState<number | null>(null)
  const [dragging, setDragging] = useState(false)
  const current = Math.max(0, Math.min(duration || 0, seek ?? progress))
  const remaining = Math.max(0, (duration || 0) - current)

  function commit(value: number) {
    const next = Math.max(0, Math.min(duration || 0, value))
    if (audio) audio.currentTime = next
    setProgress(next)
    setSeek(null)
    setDragging(false)
  }

  return (
    <div className={'sona-mobile-progress' + (dragging ? ' is-scrubbing' : '')}
      aria-label="Song playback position">
      <Slider.Root
        className="sona-mobile-scrubber"
        value={[current]}
        max={Math.max(1, duration || 0)}
        step={1}
        disabled={!duration || duration <= 0}
        onPointerDown={() => setDragging(true)}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => { setDragging(false); setSeek(null) }}
        onValueChange={([value]) => { setSeek(value); setDragging(true) }}
        onValueCommit={([value]) => commit(value)}>
        <Slider.Track className="sona-scrubber-track">
          <Slider.Range className="sona-scrubber-range" />
        </Slider.Track>
        <Slider.Thumb className="sona-scrubber-thumb" aria-label="Seek song" />
      </Slider.Root>
      <div className="sona-mobile-progress-times">
        <span aria-label="Elapsed time">{convertSecondsToTime(current)}</span>
        <span aria-label="Time remaining">-{convertSecondsToTime(remaining)}</span>
      </div>
    </div>
  )
}
