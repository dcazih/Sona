import { useEffect, type CSSProperties } from 'react'
import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { closeSonaAlbumToCover } from '@/app/components/sona/album-morph'
import { Link } from 'react-router-dom'
import { ImageLoader } from '@/app/components/image-loader'
import { SonaNoteGlyph } from '@/app/components/header/sona-note-glyph'
import { useAlbumColor } from '@/app/hooks/use-album-color'
import { ROUTES } from '@/routes/routesList'
import type { SingleAlbum } from '@/types/responses/album'
import { convertSecondsToHumanRead } from '@/utils/convertSecondsToTime'

/** Standalone mobile header. It doesn't inherit the desktop's fixed-height banner. */
export function SonaMobileAlbumHero({ album }: { album: SingleAlbum }) {
  const navigate = useNavigate()
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
    const rgb = /^#([0-9a-f]{6})$/i.exec(color)?.[1]
    const mix = rgb ? [0,2,4].map(i => {
      const channel = parseInt(rgb.slice(i,i+2),16)
      return Math.round(channel*.38 + 19*.62).toString(16).padStart(2,'0')
    }).join('') : '24202a'
    const chrome = '#' + mix
    root.style.setProperty('--sona-top-chrome-color',chrome)
    meta?.setAttribute('content',chrome)
    return () => {
      root.style.removeProperty('--sona-top-chrome-color')
      meta?.setAttribute('content','#080809')
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
      <button type="button" className="sona-mobile-album-back"
        aria-label="Back to music" onClick={() => closeSonaAlbumToCover(navigate, album.id)}>
        <ChevronLeft size={23} strokeWidth={2.2}/>
      </button>
      <div className="sona-mobile-album-cover">
        <ImageLoader id={album.coverArt} type="album" size={700}>
          {(src) => src
            ? <img id="sona-mobile-album-art" src={src} alt={album.name}
                crossOrigin="anonymous" onLoad={handleLoadImage} onError={handleError} />
            : <SonaNoteGlyph size={72} />}
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
    </section>
  )
}
