import { ChevronLeft, ChevronRight, Play } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ImageLoader } from '@/app/components/image-loader'
import { ArtworkImage } from '@/app/components/artwork-image'
import { useMusicRail } from '@/app/hooks/use-music-rail'
import './music-rail.css'
import { openSonaAlbumFromCover } from '@/app/components/sona/album-morph'
import { subsonic } from '@/service/subsonic'
import { usePlayerActions } from '@/store/player.store'
import type { ISong } from '@/types/responses/song'

/** A finite horizontal list with browser-native touch momentum. */
export function SonaMobileFeatured({ songs }: { songs: ISong[] }) {
  const rail = useMusicRail(songs.length, 'featured')
  const navigate = useNavigate()
  const { setSongList } = usePlayerActions()

  async function play(song: ISong) {
    try {
      const album = await subsonic.albums.getOne(song.albumId)
      if (!album?.song?.length) return
      const index = Math.max(0, album.song.findIndex(item => item.id === song.id))
      setSongList(album.song, index, false, {
        id: album.id, name: album.name, type: 'album',
      })
    } catch (error) {
      console.warn('Unable to play featured song', error)
    }
  }

  return (
    <section className="sona-mobile-featured" aria-label="Top picks for you">
      <div className="sona-featured-heading">
        <h2>Top Picks for You</h2>
        <div className="sona-featured-arrows" aria-label="Featured music controls">
          <button type="button" disabled={!rail.previous} onClick={() => rail.step(-1)}
            aria-label="Previous featured song"><ChevronLeft size={21}/></button>
          <button type="button" disabled={!rail.next} onClick={() => rail.step(1)}
            aria-label="Next featured song"><ChevronRight size={21}/></button>
        </div>
      </div>
      <ul ref={rail.ref} className="sona-music-rail sona-music-rail--featured" aria-label="Featured music">
          {songs.map(song => (
            <li key={song.id}>
              <article className="sona-featured-card">
                <button type="button" className="sona-featured-art"
                  aria-label={'Open album ' + song.album}
                  onClick={event => openSonaAlbumFromCover(event, navigate, song.albumId)}>
                  <ImageLoader id={song.coverArt} type="song" size={700}>
                    {(src) => <ArtworkImage src={src} alt={song.album || song.title}
                      loading="lazy" draggable={false} />}
                  </ImageLoader>
                </button>
                <div className="sona-featured-details">
                  <span className="sona-featured-eyebrow">FEATURED SONG</span>
                  <div className="sona-featured-info">
                    <div className="sona-featured-text">
                      <h3>{song.title}</h3>
                      <p>{song.artist}</p>
                    </div>
                    <button type="button" className="sona-featured-play"
                      aria-label={'Play ' + song.title}
                      onClick={() => { void play(song) }}>
                      <Play size={18} fill="currentColor"/>
                    </button>
                  </div>
                  <span className="sona-featured-album-name">{song.album}</span>
                </div>
              </article>
            </li>
          ))}
      </ul>
    </section>
  )
}
