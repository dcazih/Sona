import { NativeHeartTap } from './native-heart-tap'
import { SonaHeartGlyph } from './heart-glyph'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pause, Play, Shuffle } from 'lucide-react'
import { subsonic } from '@/service/subsonic'
import { useAppStore } from '@/store/app.store'
import {
  useIsAlbumPlaying,
  usePlayerActions,
  usePlayerStore,
} from '@/store/player.store'
import type { SingleAlbum } from '@/types/responses/album'
import { queryKeys } from '@/utils/queryKeys'
import { AlbumOptions } from '@/app/components/album/options'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu'

export function SonaMobileAlbumActions({ album }: { album: SingleAlbum }) {
  const { setSongList, togglePlayPause, toggleShuffle } = usePlayerActions()
  const { isAlbumActive, isAlbumPlaying } = useIsAlbumPlaying(album.id)
  const shuffleActive = usePlayerStore(
    (state) => state.playerState.isShuffleActive,
  )
  const hideFavorites = useAppStore().pages.hideFavoritesSection
  const queryClient = useQueryClient()
  const starred = album.starred !== undefined
  const source = { id: album.id, name: album.name, type: 'album' as const }

  const starMutation = useMutation({
    mutationFn: subsonic.star.handleStarItem,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: [queryKeys.album.single, album.id],
      }),
  })

  function play() {
    if (isAlbumActive) togglePlayPause()
    else setSongList(album.song, 0, false, source)
  }
  function shuffle() {
    if (isAlbumActive) toggleShuffle()
    else setSongList(album.song, 0, true, source)
  }

  return (
    <div
      className="sona-mobile-album-actions"
      aria-label="Album playback controls"
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            id="sona-mobile-album-options"
            type="button"
            className="sr-only"
          >
            Album options
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <AlbumOptions album={album} />
        </DropdownMenuContent>
      </DropdownMenu>
      <button
        type="button"
        className={
          'sona-mobile-album-round' +
          (isAlbumActive && shuffleActive ? ' is-active' : '')
        }
        aria-label={'Shuffle ' + album.name}
        onClick={shuffle}
        disabled={album.song.length < 2}
      >
        <Shuffle size={22} strokeWidth={2.35} />
      </button>
      <button
        type="button"
        className="sona-mobile-album-play"
        aria-label={(isAlbumPlaying ? 'Pause ' : 'Play ') + album.name}
        onClick={play}
      >
        {isAlbumPlaying ? (
          <Pause size={24} fill="currentColor" />
        ) : (
          <Play size={24} fill="currentColor" />
        )}
        <span>{isAlbumPlaying ? 'Pause' : 'Play'}</span>
      </button>
      {!hideFavorites && (
        <NativeHeartTap
          active={starred}
          label={(starred ? 'Remove ' : 'Favorite ') + album.name}
        >
          <button
            type="button"
            className={
              'sona-mobile-album-round' + (starred ? ' is-active' : '')
            }
            aria-label={(starred ? 'Remove ' : 'Favorite ') + album.name}
            onClick={() => {
              navigator.vibrate?.(10)
              starMutation.mutate({ id: album.id, starred })
            }}
          >
            <SonaHeartGlyph active={starred} size={23} />
          </button>
        </NativeHeartTap>
      )}
    </div>
  )
}
