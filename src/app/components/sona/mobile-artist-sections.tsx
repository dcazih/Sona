import { Link } from 'react-router-dom'
import { ArtworkImage } from '@/app/components/artwork-image'
import { ImageLoader } from '@/app/components/image-loader'
import { ROUTES } from '@/routes/routesList'
import { usePlayerActions, usePlayerCurrentSong } from '@/store/player.store'
import type { Albums } from '@/types/responses/album'
import type { ISong } from '@/types/responses/song'
import { SonaNoteGlyph } from '@/app/components/header/sona-note-glyph'
import './mobile-artist-sections.css'

function AlbumRail({ title, albums, large = false }: { title: string; albums: Albums[]; large?: boolean }) {
  if (!albums.length) return null
  return <section className={'sona-artist-album-section' + (large ? ' is-essential' : '')}>
    <h2>{title}</h2>
    <div className="sona-artist-album-rail">
      {albums.map(album => <Link key={album.id} to={ROUTES.ALBUM.PAGE(album.id)} className="sona-artist-album-card">
        <ImageLoader id={album.coverArt} type="album" size={large ? 700 : 300}>
          {src => <ArtworkImage src={src} alt="" loading="eager" />}
        </ImageLoader>
        <strong>{album.name}</strong>
      </Link>)}
    </div>
  </section>
}

export function SonaMobileArtistSections({ artistId, artistName, songs, albums }: {
  artistId: string; artistName: string; songs: ISong[]; albums: Albums[]
}) {
  const { setSongList } = usePlayerActions()
  const currentSong = usePlayerCurrentSong()
  const ordered = albums.filter(album => !album.releaseTypes?.some(type => type.toLowerCase() === 'single') && album.songCount !== 1)
  const singles = albums.filter(album => album.releaseTypes?.some(type => type.toLowerCase() === 'single') || album.songCount === 1)
  const essential = [...ordered].sort((a, b) => (b.playCount || 0) - (a.playCount || 0)).slice(0, 4)
  const popular = songs.slice(0, 16)
  return <div className="sona-mobile-artist-sections">
    {popular.length > 0 && <section className="sona-artist-popular">
      <h2>Popular</h2>
      <div className="sona-artist-popular-grid">
        {popular.map((song, index) => <button type="button" key={song.id} className={'sona-artist-popular-song' + (song.id === currentSong?.id ? ' is-playing' : '')}
          onClick={() => setSongList(popular, index, false, { id: artistId, name: artistName, type: 'artist' })}>
          <ImageLoader id={song.coverArt} type="song" size={110}>{src => <ArtworkImage src={src} alt="" loading="eager" />}</ImageLoader>
          <span><strong>{song.title}</strong><small>{song.artist}</small></span>
          {song.id === currentSong?.id && <SonaNoteGlyph size={18} />}
        </button>)}
      </div>
    </section>}
    <AlbumRail title="Essential Albums" albums={essential} large />
    <AlbumRail title="Albums" albums={ordered} />
    <AlbumRail title="Singles" albums={singles} />
  </div>
}
