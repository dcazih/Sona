import { toast } from 'react-toastify'
import { SonaHeartGlyph } from '@/app/components/sona/heart-glyph'
import { useIsMobile } from '@/app/hooks/use-mobile'
import { useState } from 'react'
import { Button } from '@/app/components/ui/button'
import { usePlayerActions, usePlayerSongStarred } from '@/store/player.store'
import { buttonsStyle } from './controls'

export function LikeButton() {
  const { starCurrentSong } = usePlayerActions()
  const isSongStarred = usePlayerSongStarred()

  const mobile = useIsMobile()
  const [pending, setPending] = useState<boolean | null>(null)
  const active = pending ?? isSongStarred
  const toggle = async () => {
    navigator.vibrate?.(10)
    setPending(!active)
    try {
      await starCurrentSong()
    } catch {
      toast.error('Unable to update favorite')
    } finally {
      setPending(null)
    }
  }
  if (mobile)
    return (
      <label className="sona-native-heart">
        <input
          ref={(node) => node?.setAttribute('switch', '')}
          type="checkbox"
          aria-label="Favorite current song"
          checked={active}
          onChange={() => void toggle()}
        />
        <SonaHeartGlyph active={active} size={30} />
      </label>
    )
  return (
    <Button
      size="icon"
      variant="ghost"
      className={buttonsStyle.secondary}
      onClick={() => void toggle()}
      style={{ ...buttonsStyle.style }}
    >
      <SonaHeartGlyph active={active} className={buttonsStyle.secondaryIcon} />
    </Button>
  )
}
