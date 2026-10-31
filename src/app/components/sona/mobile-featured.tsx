import { ChevronLeft, ChevronRight, Play } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ImageLoader } from '@/app/components/image-loader'
import { useSonaMomentumSnap } from '@/app/hooks/use-sona-momentum-snap'
import { SonaNoteGlyph } from '@/app/components/header/sona-note-glyph'
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/app/components/ui/carousel'
import { openSonaAlbumFromCover } from '@/app/components/sona/album-morph'
import { subsonic } from '@/service/subsonic'
import { usePlayerActions } from '@/store/player.store'
import type { ISong } from '@/types/responses/song'

let featuredSongId: string | null = null

/** iOS-style featured music: one finger swipe advances exactly one card. */
export function SonaMobileFeatured({ songs }: { songs: ISong[] }) {
  const [api, setApi] = useState<CarouselApi>()
  const [previous, setPrevious] = useState(false)
  const [next, setNext] = useState(false)
  const navigate = useNavigate()
  const { setSongList } = usePlayerActions()
  const gestures = useSonaMomentumSnap(api, songs.length)

  useEffect(() => {
    if (!api) return
    function update() {
      if (!api) return
      featuredSongId = songs[api.selectedScrollSnap()]?.id ?? null
      setPrevious(api.canScrollPrev())
      setNext(api.canScrollNext())
    }
    update()
    api.on('select', update)
    api.on('reInit', update)
    return () => { api.off('select', update); api.off('reInit', update) }
  }, [api, songs])

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
          <button type="button" disabled={!previous} onClick={() => api?.scrollPrev()}
            aria-label="Previous featured song"><ChevronLeft size={21}/></button>
          <button type="button" disabled={!next} onClick={() => api?.scrollNext()}
            aria-label="Next featured song"><ChevronRight size={21}/></button>
        </div>
      </div>
      <Carousel className="sona-featured-carousel" setApi={setApi}
        {...gestures}
        opts={{ align: 'center', containScroll: false,
          startIndex: Math.max(0, songs.findIndex(song => song.id === featuredSongId)),
          loop: songs.length > 2, slidesToScroll: 1, dragFree: false,
          skipSnaps: true, duration: 26 }}>
        <CarouselContent className="sona-featured-track">
          {songs.map(song => (
            <CarouselItem key={song.id} className="sona-featured-slide">
              <article className="sona-featured-card">
                <button type="button" className="sona-featured-art"
                  aria-label={'Open album ' + song.album}
                  onClick={event => openSonaAlbumFromCover(event, navigate, song.albumId)}>
                  <ImageLoader id={song.coverArt} type="song" size={700}>
                    {(src) => src
                      ? <img src={src} alt={song.album || song.title} loading="lazy"
                          draggable={false} />
                      : <SonaNoteGlyph size={70}/>}
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
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </section>
  )
}
