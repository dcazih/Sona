import { useMemo, type CSSProperties } from 'react'
import { useSongColor } from '@/store/player.store'

/**
 * Reuses the cover-art dominant color already extracted by Aonsoku's TrackInfo.
 * Keeping the old color until the next artwork finishes loading avoids flashing
 * to a neutral background during track changes.
 */
export function useSonaAmbient(): CSSProperties {
  const { currentSongColor } = useSongColor()
  const color = currentSongColor && /^#[\da-f]{6}$/i.test(currentSongColor)
    ? currentSongColor
    : '#755265'

  return useMemo(
    () => ({ '--sona-ambient-color': color }) as CSSProperties,
    [color],
  )
}
