import { useFavoriteSongs } from '@/app/hooks/use-favorite-songs'
import { usePlayerActions, usePlayerStore } from '@/store/player.store'
import { SectionActionButtons, SonaSongRows } from './mobile-section-pages'

export default function SonaMobileFavorites() {
  const { data, isLoading } = useFavoriteSongs()
  const songs = data?.songs || []
  const { setSongList, togglePlayPause } = usePlayerActions()
  const active = usePlayerStore(
    (state) => state.playerState.playbackContext.source?.type === 'favourite',
  )
  const play = (shuffle = false) => {
    if (active && !shuffle) togglePlayPause()
    else if (songs.length)
      setSongList(songs, 0, shuffle, {
        id: 'favourite',
        name: 'Favorites',
        type: 'favourite',
      })
  }
  return (
    <section
      className="sona-section-page sona-favorites-page"
      aria-label="Favorites"
    >
      <h1 className="sona-section-heading">Favorites</h1>
      <SectionActionButtons
        onPlay={() => play()}
        onShuffle={() => play(true)}
      />
      {isLoading ? (
        <p className="sona-section-empty">Loading favorites…</p>
      ) : (
        <SonaSongRows
          songs={songs}
          onPlay={(index) =>
            setSongList(songs, index, false, {
              id: 'favourite',
              name: 'Favorites',
              type: 'favourite',
            })
          }
        />
      )}
    </section>
  )
}
