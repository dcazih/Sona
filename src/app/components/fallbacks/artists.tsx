import { useIsMobile } from '@/app/hooks/use-mobile'
import { AlbumFallback } from './album-fallbacks'
import { Skeleton } from '@/app/components/ui/skeleton'
import { AlbumsFallback } from '@/app/components/fallbacks/album-fallbacks.tsx'
import { SongListFallback } from '@/app/components/fallbacks/song-fallbacks.tsx'
import { useAppArtistsViewType } from '@/store/app.store.ts'

export function ArtistsFallback() {
  const { isTableView } = useAppArtistsViewType()

  if (isTableView) return <SongListFallback />

  return <AlbumsFallback />
}

export function MobileArtistLoading() {
  return (
    <div
      className="sona-artist-page sona-artist-loading"
      aria-label="Loading artist"
      aria-busy="true"
    >
      <section className="sona-mobile-artist-hero">
        <Skeleton className="sona-mobile-artist-art" />
        <div className="sona-mobile-artist-copy">
          <p>
            <Skeleton className="h-3 w-14 mx-auto" />
          </p>
          <h1>
            <Skeleton className="h-9 w-52 mx-auto" />
          </h1>
          <span>
            <Skeleton className="h-4 w-32 mx-auto" />
          </span>
        </div>
      </section>
      <div className="px-5">
        <div className="sona-artist-actions flex justify-center gap-1 mb-6">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="w-14 h-14 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-6 w-28 mb-4" />
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="flex items-center gap-3 py-3">
            <Skeleton className="w-8 h-8 rounded" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function ArtistDetailFallback() {
  const mobile = useIsMobile()
  return mobile ? <MobileArtistLoading /> : <AlbumFallback />
}

export function MobileArtistSongsLoading() {
  return (
    <div aria-label="Loading artist songs">
      <Skeleton className="h-6 w-28 mb-4" />
      {Array.from({ length: 5 }, (_, index) => (
        <div
          key={index}
          style={{ height: 52 }}
          className="flex items-center gap-3 border-b border-white/5"
        >
          <Skeleton className="w-5 h-4" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  )
}
