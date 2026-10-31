import { ImageLoader } from '@/app/components/image-loader'
import { SonaNoteGlyph } from '@/app/components/header/sona-note-glyph'
import type { IArtist } from '@/types/responses/artist'

export function SonaMobileArtistHero({ artist, songCount }: { artist: IArtist; songCount: string | null }) {
  return (
    <section className="sona-mobile-artist-hero" aria-label={'Artist: ' + artist.name}>
      <div className="sona-mobile-artist-art">
        <ImageLoader id={artist.coverArt} type="artist" size={700}>
          {(src) => src ? <img src={src} alt={artist.name}/> : <SonaNoteGlyph size={72}/>} 
        </ImageLoader>
      </div>
      <div className="sona-mobile-artist-copy">
        <p>ARTIST</p><h1>{artist.name}</h1>
        <span>{[artist.albumCount ? artist.albumCount + (artist.albumCount === 1 ? ' album' : ' albums') : null, songCount].filter(Boolean).join(' · ')}</span>
      </div>
    </section>
  )
}
