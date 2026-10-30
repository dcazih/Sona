import { useState } from 'react'
import { ProgressSlider } from '@/app/components/ui/slider'
import { usePlayerActions, usePlayerDuration, usePlayerProgress, usePlayerRef } from '@/store/player.store'
import { convertSecondsToTime } from '@/utils/convertSecondsToTime'

/** iPhone layout: scrubber on top, elapsed / time remaining aligned underneath. */
export function SonaMobileProgress() {
  const progress = usePlayerProgress()
  const duration = usePlayerDuration()
  const audio = usePlayerRef()
  const { setProgress } = usePlayerActions()
  const [seek, setSeek] = useState<number | null>(null)
  const current = Math.max(0, Math.min(duration || 0, seek ?? progress))
  const remaining = Math.max(0, (duration || 0) - current)

  function commit(value: number) {
    const next = Math.max(0, Math.min(duration || 0, value))
    if (audio) audio.currentTime = next
    setProgress(next)
    setSeek(null)
  }

  return (
    <div className="sona-mobile-progress" aria-label="Song playback position">
      <ProgressSlider
        variant="secondary"
        value={[current]}
        max={Math.max(1, duration || 0)}
        step={1}
        disabled={!duration || duration <= 0}
        tooltipTransformer={convertSecondsToTime}
        className="sona-mobile-scrubber"
        onValueChange={([value]) => setSeek(value)}
        onValueCommit={([value]) => commit(value)}
      />
      <div className="sona-mobile-progress-times">
        <span aria-label="Elapsed time">{convertSecondsToTime(current)}</span>
        <span aria-label="Time remaining">-{convertSecondsToTime(remaining)}</span>
      </div>
    </div>
  )
}
