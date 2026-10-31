import Autoplay from 'embla-carousel-autoplay'
import { useEffect, useState } from 'react'
import { HeaderFallback } from '@/app/components/fallbacks/home-fallbacks'
import { HeaderItem } from '@/app/components/home/carousel/header-item'
import { SonaMobileFeatured } from '@/app/components/sona/mobile-featured'
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/app/components/ui/carousel'
import { useGetRandomSongs } from '@/app/hooks/use-home'
import { useAppStore } from '@/store/app.store'

// Keep the featured song in place when switching between mobile tabs.
let lastFeaturedIndex = 0

export function HomeHeader() {
  const [api, setApi] = useState<CarouselApi>()
  const { data: songs, isLoading } = useGetRandomSongs()
  const autoScrollEnabled = useAppStore().pages.homeAutoScrollEnabled
  const loopEnabled = useAppStore().pages.homeLoopEnabled

  useEffect(() => {
    if (!api) return
    api.scrollTo(lastFeaturedIndex, true)
    const onSelect = () => { lastFeaturedIndex = api.selectedScrollSnap() }
    api.on('select', onSelect)
    return () => { api.off('select', onSelect) }
  }, [api])

  if (isLoading && !songs) return <HeaderFallback />
  if (!songs || songs.length === 0) return null

  return (
    <>
      <div className="md:hidden"><SonaMobileFeatured songs={songs} /></div>
      <div className="hidden md:block">
    <Carousel
      setApi={setApi}
      className="w-full overflow-hidden z-10"
      opts={{
        loop: loopEnabled,
        breakpoints: { '(max-width: 767px)': { active: false } },
      }}
      plugins={[
        Autoplay({
          delay: 10000,
          active: autoScrollEnabled,
        }),
      ]}
      data-testid="header-carousel"
    >
      <CarouselContent className="ml-0 flex">
        {songs.map((song, index) => (
          <CarouselItem
            key={song.id}
            className="pl-0 basis-full maskImage-carousel-item transform-gpu"
            data-testid={`carousel-header-song-${index}`}
          >
            <HeaderItem song={song} />
          </CarouselItem>
        ))}
      </CarouselContent>
      <div className="absolute right-8 bottom-6 flex items-center gap-2">
        <CarouselPrevious
          data-testid="header-carousel-previous"
          className="relative inset-0 translate-x-0 translate-y-0 shadow-sm"
        />
        <CarouselNext
          data-testid="header-carousel-next"
          className="relative inset-0 translate-x-0 translate-y-0 shadow-sm"
        />
      </div>
    </Carousel>
      </div>
    </>
  )
}
