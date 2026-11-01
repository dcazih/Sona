import { useIsMobile } from '@/app/hooks/use-mobile'
import './album-loading.css'
import { ImageHeaderEffect } from '@/app/components/album/header-effect'
import { TableFallback } from '@/app/components/fallbacks/table-fallbacks'
import { ShadowHeaderFallback } from '@/app/components/fallbacks/ui-fallbacks'
import ListWrapper from '@/app/components/list-wrapper'
import { MainGrid } from '@/app/components/main-grid'
import { Skeleton } from '@/app/components/ui/skeleton'

export function AlbumHeaderFallback() {
  return (
    <div className="w-full px-8 py-6 bg-muted-foreground flex gap-4 bg-gradient-to-b from-background/50 to-background/50">
      <Skeleton className="rounded shadow-lg w-[200px] h-[200px] min-w-[200px] min-h-[200px] 2xl:w-[250px] 2xl:h-[250px] 2xl:min-w-[250px] 2xl:min-h-[250px] aspect-square" />
      <div className="flex flex-col justify-end">
        <Skeleton className="h-[20px] w-16 mb-4" />
        <Skeleton className="h-12 w-[260px] mb-4" />
        <Skeleton className="h-5 w-[340px] mb-1" />

        <div className="flex gap-2 mt-2">
          <Skeleton className="h-[22px] w-12 rounded-full" />
          <Skeleton className="h-[22px] w-12 rounded-full" />
          <Skeleton className="h-[22px] w-12 rounded-full" />
        </div>
      </div>
    </div>
  )
}

export function PlayButtonsFallback() {
  return (
    <div className="mb-6 flex gap-1 items-center">
      <Skeleton className="rounded-full w-14 h-14 mr-2" />
      <div className="flex items-center justify-center w-14 h-14">
        <Skeleton className="rounded-full w-7 h-7" />
      </div>
      <div className="flex items-center justify-center w-14 h-14">
        <Skeleton className="rounded-full w-7 h-7" />
      </div>
    </div>
  )
}

export function AlbumFallback() {
  const isMobile = useIsMobile()
  if (isMobile) return <MobileAlbumLoading />
  return (
    <div className="w-full">
      <div className="relative">
        <AlbumHeaderFallback />
        <ImageHeaderEffect className="bg-muted-foreground" />
      </div>
      <ListWrapper>
        <PlayButtonsFallback />
        <TableFallback variant="modern" />
      </ListWrapper>
    </div>
  )
}

export function AlbumsFallback() {
  return (
    <div className="w-full">
      <ShadowHeaderFallback />

      <ListWrapper className="flex flex-col gap-4">
        <GridFallback />
      </ListWrapper>
    </div>
  )
}

function GridFallback() {
  return (
    <MainGrid>
      {Array.from({ length: 40 }).map((_, index) => (
        <div key={'card-fallback-' + index}>
          <Skeleton className="aspect-square" />
          <Skeleton className="h-[13px] w-11/12 mt-2" />
          <Skeleton className="h-3 w-1/2 mt-[7px]" />
        </div>
      ))}
    </MainGrid>
  )
}

/** Uses the loaded mobile hero and track-row geometry, without desktop columns. */
export function MobileAlbumLoading() {
  return (
    <div className="sona-album-page sona-album-loading w-full relative" role="status" aria-label="Loading album" aria-busy="true">
      <section className="sona-mobile-album-hero" aria-hidden="true">
        <Skeleton className="sona-mobile-album-cover" />
        <div className="sona-mobile-album-details">
          <p className="sona-mobile-album-kicker"><Skeleton className="h-3 w-12" /></p>
          <h1><Skeleton className="h-8 w-64 max-w-full" /></h1>
          <div className="sona-mobile-album-artist"><Skeleton className="h-5 w-40" /></div>
          <p className="sona-mobile-album-facts"><Skeleton className="h-[18px] w-52" /></p>
        </div>
        <div className="sona-mobile-album-actions">
          <Skeleton className="sona-mobile-album-round" />
          <Skeleton className="sona-mobile-album-play" />
          <Skeleton className="sona-mobile-album-round" />
        </div>
      </section>
      <ListWrapper aria-hidden="true">
        <section className="sona-album-songs">
          <div className="sona-album-songs-heading"><Skeleton className="h-5 w-16" /><Skeleton className="h-3 w-12" /></div>
          <div className="sona-album-songs-list">
            {Array.from({ length: 8 }, (_, index) => (
              <div className="sona-album-song-row" key={index}>
                <span className="sona-album-song-index"><Skeleton className="h-3 w-3" /></span>
                <div className="sona-album-song-main"><Skeleton className="h-[14px] w-3/4" /></div>
                <span className="sona-album-song-duration"><Skeleton className="h-3 w-7" /></span>
                <div className="sona-album-song-more"><Skeleton className="h-2 w-4" /></div>
              </div>
            ))}
          </div>
        </section>
      </ListWrapper>
      <span className="sr-only">Loading album</span>
    </div>
  )
}
