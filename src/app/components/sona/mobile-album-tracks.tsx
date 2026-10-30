import { Ellipsis, Music2 } from 'lucide-react'
import { ImageLoader } from '@/app/components/image-loader'
import { SongMenuOptions } from '@/app/components/song/menu-options'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/app/components/ui/dropdown-menu'
import { usePlayerActions, usePlayerCurrentSong } from '@/store/player.store'
import { SingleAlbum } from '@/types/responses/album'
import { convertSecondsToTime } from '@/utils/convertSecondsToTime'

export function SonaMobileAlbumTracks({ album }: { album: SingleAlbum }) {
  const { setSongList } = usePlayerActions()
  const currentSong = usePlayerCurrentSong()

  function play(index: number) {
    setSongList(album.song, index, false, {
      id: album.id, name: album.name, type: 'album',
    })
  }

  return (
    <section className="sona-album-songs" aria-label={'Tracks on ' + album.name}>
      <div className="sona-album-songs-heading">
        <strong>Songs</strong>
        <span>{album.song.length} tracks</span>
      </div>
      {album.song.map((song, index) => {
        const active = Boolean(song.id && song.id === currentSong?.id)
        return (
          <div className={'sona-album-song-row' + (active ? ' is-playing' : '')}
            key={song.id + ':' + index}>
            <button type="button" className="sona-album-song-select"
              aria-label={'Play ' + song.title} onClick={() => play(index)}>
              <span className="sona-album-song-index">{active ? <Music2 size={19} /> : (song.track || index + 1)}</span>
              <span className="sona-album-song-art">
                {song.coverArt ? <ImageLoader id={song.coverArt} type="song" size={100}>
                  {(src) => <img src={src} alt="" loading="lazy" />}
                </ImageLoader> : <Music2 size={18} />}
              </span>
              <span className="sona-album-song-text">
                <strong>{song.title}</strong>
                <small>{song.artist || album.artist}</small>
              </span>
            </button>
            <span className="sona-album-song-duration">{convertSecondsToTime(song.duration || 0)}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="sona-album-song-more" type="button"
                  aria-label={'Options for ' + song.title}><Ellipsis size={21}/></button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <SongMenuOptions variant="dropdown" song={song} index={index} />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      })}
    </section>
  )
}
