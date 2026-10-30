import { Skeleton } from '@/app/components/ui/skeleton'

export function HeaderFallback() {
  return (
    <>
      {/* Match the actual portrait music card, not the old horizontal banner. */}
      <section className="sona-featured-loading md:hidden" aria-label="Loading featured music">
        <div className="sona-featured-heading">
          <h2>Top Picks for You</h2>
          <div className="sona-featured-arrows" aria-hidden="true">
            <span className="sona-featured-arrow-placeholder" />
            <span className="sona-featured-arrow-placeholder" />
          </div>
        </div>
        <div className="sona-featured-loading-row">
          {[0,1].map(index => (
            <div key={index} className="sona-featured-loading-slide">
              <div className="sona-featured-loading-card">
                <Skeleton className="sona-featured-loading-cover" />
                <div className="sona-featured-loading-details">
                  <Skeleton className="sona-featured-loading-tag" />
                  <Skeleton className="sona-featured-loading-song" />
                  <Skeleton className="sona-featured-loading-artist" />
                  <Skeleton className="sona-featured-loading-album" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      <div className="sona-home-hero-fallback hidden md:flex w-full bg-skeleton h-[250px] 2xl:h-[300px] px-8 py-6 gap-4"
        aria-label="Loading featured music">
        <Skeleton className="sona-home-hero-fallback-cover bg-background/50 h-full aspect-square rounded-lg" />
        <div className="sona-home-hero-fallback-content flex flex-col gap-3 w-full h-full justify-end">
          <Skeleton className="sona-home-hero-fallback-title w-80 h-9 bg-background/50" />
          <Skeleton className="sona-home-hero-fallback-artist w-48 h-6 bg-background/50" />
          <div className="sona-home-hero-fallback-badges flex gap-2">
            <Skeleton className="w-16 h-6 bg-background/50 rounded-full" />
            <Skeleton className="w-16 h-6 bg-background/50 rounded-full" />
            <Skeleton className="w-16 h-6 bg-background/50 rounded-full" />
          </div>
        </div>
        <div className="sona-home-hero-fallback-arrows flex gap-2 h-full items-end">
          <Skeleton className="w-8 h-8 bg-background/50 rounded-full" />
          <Skeleton className="w-8 h-8 bg-background/50 rounded-full" />
        </div>
      </div>
    </>
  )
}

export function HomeFallback() {
  return (
    <div className="w-full">
      <HeaderFallback />
      <div className="px-8 pb-6">
        <PreviewListFallback />
        <PreviewListFallback />
        <PreviewListFallback />
        <PreviewListFallback />
      </div>
    </div>
  )
}

export function PreviewListFallback() {
  return (
    <div className="w-full flex flex-col my-4">
      <div className="flex justify-between my-4">
        <Skeleton className="w-52 h-8 rounded" />
        <div className="flex gap-2">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="w-8 h-8 rounded-full" />
        </div>
      </div>
      <SongsCarouselFallback />
    </div>
  )
}

export function SongsCarouselFallback() {
  return (
    <>
      <div className="hidden 2xl:flex gap-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div className="basis-1/8" key={'large-' + index}>
            <Skeleton className="aspect-square" />
            <Skeleton className="h-[13px] w-11/12 mt-2" />
            <Skeleton className="h-3 w-1/2 mt-[7px]" />
          </div>
        ))}
      </div>
      <div className="flex 2xl:hidden gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div className="basis-1/5" key={'small-' + index}>
            <Skeleton className="aspect-square" />
            <Skeleton className="h-[13px] w-11/12 mt-2" />
            <Skeleton className="h-3 w-1/2 mt-[7px]" />
          </div>
        ))}
      </div>
    </>
  )
}
