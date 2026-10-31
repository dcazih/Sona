import { useEffect, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { ImageLoader } from '@/app/components/image-loader'
import { ArtworkImage } from '@/app/components/artwork-image'
import { useAlbumColor } from '@/app/hooks/use-album-color'
import { ROUTES } from '@/routes/routesList'
import type { SingleAlbum } from '@/types/responses/album'
import { convertSecondsToHumanRead } from '@/utils/convertSecondsToTime'
import { SonaMobileAlbumActions } from './mobile-album-actions'

/** Standalone mobile header. It doesn't inherit the desktop's fixed-height banner. */
export function SonaMobileAlbumHero({ album }: { album: SingleAlbum }) {
  const { bgColor, handleLoadImage, handleError } = useAlbumColor('sona-mobile-album-art')
  const color = bgColor || '#342730'

  useEffect(() => {
    const viewport = document.getElementById('main-scroll-area')
    if (!viewport) return
    viewport.style.setProperty('--sona-page-album-color', color)
    return () => viewport.style.removeProperty('--sona-page-album-color')
  }, [color])

  useEffect(() => {
    // The iPhone status-bar area and the album toolbar use one exact shade,
    // derived from the artwork's dominant color rather than a separate overlay.
    const root = document.documentElement
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    root.style.setProperty('--sona-album-notch-color','#000000')
    if (root.dataset.sonaNotchOwner !== 'player') {
      root.style.setProperty('--sona-notch-color','#000000')
      meta?.setAttribute('content','#000000')
    }
    return () => {
      root.style.removeProperty('--sona-album-notch-color')
      if (root.dataset.sonaNotchOwner !== 'player') {
        root.style.setProperty('--sona-notch-color','#000000')
        meta?.setAttribute('content','#000000')
      }
    }
  }, [color])

  const info = [
    album.year ? String(album.year) : null,
    album.genre || null,
    album.song.length === 1 ? '1 song' : album.song.length + ' songs',
    album.duration ? convertSecondsToHumanRead(album.duration) : null,
  ].filter(Boolean)

  return (
    <section className="sona-mobile-album-hero"
      style={{ '--sona-page-album-color': color } as CSSProperties}
      aria-label={'Album: ' + album.name}>
      <div className="sona-mobile-album-cover">
        <ImageLoader id={album.coverArt} type="album" size={700}>
          {(src) => <ArtworkImage id="sona-mobile-album-art" src={src} alt={album.name}
            crossOrigin="anonymous" onLoad={handleLoadImage} onError={handleError} />}
        </ImageLoader>
      </div>
      <div className="sona-mobile-album-details">
        <p className="sona-mobile-album-kicker">ALBUM</p>
        <h1>{album.name}</h1>
        {album.artistId
          ? <Link to={ROUTES.ARTIST.PAGE(album.artistId)} className="sona-mobile-album-artist">
              {album.artist}
            </Link>
          : <p className="sona-mobile-album-artist">{album.artist}</p>}
        <p className="sona-mobile-album-facts">{info.join(' · ')}</p>
      </div>
      <SonaMobileAlbumActions album={album}/>
    </section>
  )
}
