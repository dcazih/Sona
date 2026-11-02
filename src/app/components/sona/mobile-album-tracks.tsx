import { Ellipsis } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PlayingBars } from './playing-bars'
import { SongMenuOptions } from '@/app/components/song/menu-options'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/app/components/ui/dropdown-menu'
import { ROUTES } from '@/routes/routesList'
import { usePlayerActions, usePlayerCurrentSong } from '@/store/player.store'
import type { SingleAlbum } from '@/types/responses/album'
import { SongExplicitMark } from './song-explicit-mark'

export function SonaMobileAlbumTracks({ album, showHeading = true, sourceType = 'album' }: { album: Pick<SingleAlbum,'id'|'name'|'artist'|'song'>; showHeading?:boolean; sourceType?:'album'|'favourite' }) {
  const { setSongList } = usePlayerActions()
  const currentSong = usePlayerCurrentSong()

  function play(index: number) {
    setSongList(album.song, index, false, {
      id: album.id, name: album.name, type: sourceType,
    })
  }

  return (
    <section className="sona-album-songs" aria-label={'Tracks on ' + album.name}>
      {showHeading && <div className="sona-album-songs-heading">
        <strong>Songs</strong>
        <span>{album.song.length} {album.song.length === 1 ? 'track' : 'tracks'}</span>
      </div>}
      <div className="sona-album-songs-list">
        {album.song.map((song, index) => {
          const active = Boolean(song.id && song.id === currentSong?.id)
          const showArtist = Boolean(song.artist && song.artistId && song.artist !== album.artist)
          return (
            <div className={'sona-album-song-row' + (active ? ' is-playing' : '')}
              key={song.id + ':' + index}
              onClick={(event) => {
                // The entire Apple-style track row is tappable. Artist links and
                // the options menu must keep their separate actions.
                if ((event.target as HTMLElement).closest('button,a')) return
                play(index)
              }}>
              <span className="sona-album-song-index">
                {active ? <PlayingBars size={20}/> : (sourceType === 'favourite' ? index + 1 : song.track || index + 1)}
              </span>
              <div className="sona-album-song-main">
                <button type="button" className="sona-album-song-title"
                  aria-label={'Play ' + song.title} onClick={() => play(index)}>
                  {song.title}<SongExplicitMark song={song}/>
                </button>
                {showArtist && song.artistId && (
                  <Link className="sona-album-song-secondary-artist"
                    to={ROUTES.ARTIST.PAGE(song.artistId)}>{song.artist}</Link>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="sona-album-song-more"
                    aria-label={'Options for ' + song.title}><Ellipsis size={22}/></button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <SongMenuOptions variant="dropdown" song={song} index={index}/>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        })}
      </div>
    </section>
  )
}
