import * as Slider from '@radix-ui/react-slider'
import { Volume2, VolumeX } from 'lucide-react'
import { useState } from 'react'
import { usePlayerVolume } from '@/store/player.store'

/** Volume shares the scrubber's touch feedback without numeric tooltips. */
export function SonaMobileVolume() {
  const { volume, setVolume } = usePlayerVolume()
  const [scrubbing, setScrubbing] = useState(false)
  return (
    <div className={'sona-mobile-volume-control' + (scrubbing ? ' is-scrubbing' : '')}
      aria-label="Playback volume">
      <VolumeX size={17} strokeWidth={1.8} aria-hidden="true" />
      <Slider.Root className="sona-volume-slider"
        value={[volume]}
        min={0} max={100} step={1}
        aria-label="Volume"
        onPointerDown={() => setScrubbing(true)}
        onPointerUp={() => setScrubbing(false)}
        onPointerCancel={() => setScrubbing(false)}
        onValueChange={([value]) => { setVolume(value); setScrubbing(true) }}
        onValueCommit={() => setScrubbing(false)}>
        <Slider.Track className="sona-volume-track">
          <Slider.Range className="sona-volume-range" />
        </Slider.Track>
        <Slider.Thumb className="sona-volume-thumb" aria-label="Volume" />
      </Slider.Root>
      <Volume2 size={22} strokeWidth={1.8} aria-hidden="true" />
    </div>
  )
}
