import { useIsMobile } from '@/app/hooks/use-mobile'
import { useMobileDetailReveal } from '@/app/hooks/use-mobile-detail-reveal'
import {
  MobileArtistLoading,
  MobileArtistSongsLoading,
} from '@/app/components/fallbacks/artists'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import ImageHeader from '@/app/components/album/image-header'
import ArtistTopSongs from '@/app/components/artist/artist-top-songs'
import { ArtistInfo } from '@/app/components/artist/info'
import RelatedArtistsList from '@/app/components/artist/related-artists'
import { ArtistStickyHeader } from '@/app/components/artist/sticky-header'
import { AlbumFallback } from '@/app/components/fallbacks/album-fallbacks'
import { PreviewListFallback } from '@/app/components/fallbacks/home-fallbacks'
import { TopSongsTableFallback } from '@/app/components/fallbacks/table-fallbacks'
import { BadgesData } from '@/app/components/header-info'
import PreviewList from '@/app/components/home/preview-list'
import ListWrapper from '@/app/components/list-wrapper'
import {
  useGetArtist,
  useGetArtistInfo,
  useGetTopSongs,
} from '@/app/hooks/use-artist'
import ErrorPage from '@/app/pages/error-page'
import { ROUTES } from '@/routes/routesList'
import { sortRecentAlbums } from '@/utils/album'
import { SonaMobileArtistHero } from '@/app/components/sona/mobile-artist-hero'
import { SonaMobileArtistSections } from '@/app/components/sona/mobile-artist-sections'

export default function Artist() {
  const { t } = useTranslation()
  const mobile = useIsMobile()
  const { artistId } = useParams() as { artistId: string }

  const {
    data: artist,
    isLoading: artistIsLoading,
    isFetched,
  } = useGetArtist(artistId)
  const { data: artistInfo, isLoading: artistInfoIsLoading } =
    useGetArtistInfo(artistId)
  const { data: topSongs, isLoading: topSongsIsLoading } = useGetTopSongs(
    artist?.name,
  )
  const showBlack = useMobileDetailReveal(artistId, artistIsLoading)

  if (showBlack && mobile) return <div className="sona-detail-black" aria-label="Loading artist" />
  if (artistIsLoading)
    return mobile ? <MobileArtistLoading /> : <AlbumFallback />
  if (isFetched && !artist) {
    return <ErrorPage status={404} statusText="Not Found" />
  }
  if (!artist) return mobile ? <MobileArtistLoading /> : <AlbumFallback />

  function getSongCount() {
    if (!artist) return null
    if (artist.albumCount === undefined) return null
    if (artist.albumCount === 0) return null
    if (!artist.album) return null
    let artistSongCount = 0

    artist.album.forEach((album) => {
      artistSongCount += album.songCount
    })

    return t('playlist.songCount', { count: artistSongCount })
  }

  function formatAlbumCount() {
    if (!artist) return null
    if (artist.albumCount === undefined) return null
    if (artist.albumCount === 0) return null

    return t('artist.info.albumsCount', { count: artist.albumCount })
  }

  const albumCount = formatAlbumCount()
  const songCount = getSongCount()

  const badges: BadgesData = [
    {
      content: albumCount,
      type: 'link',
      link: ROUTES.ALBUMS.ARTIST(artist.id, artist.name),
    },
    {
      content: songCount,
      type: 'link',
      link: ROUTES.SONGS.ARTIST_TRACKS(artist.id, artist.name),
    },
  ]

  const recentAlbums = artist.album ? sortRecentAlbums(artist.album) : []

  return (
    <div className="sona-artist-page w-full relative">
      {!mobile && <ArtistStickyHeader artist={artist} />}

      <div className="hidden md:block">
        <ImageHeader
          type={t('artist.headline')}
          title={artist.name}
          coverArtId={artist.coverArt}
          coverArtType="artist"
          coverArtSize="700"
          coverArtAlt={artist.name}
          badges={badges}
        />
      </div>
      <div className="md:hidden">
        <SonaMobileArtistHero artist={artist} songCount={songCount} />
        <SonaMobileArtistSections artistId={artist.id} artistName={artist.name} songs={topSongs || []} albums={recentAlbums} />
      </div>

      <ListWrapper className={mobile ? 'sona-mobile-artist-extra' : undefined}>
        {mobile ? <details className="sona-mobile-artist-about"><summary>About {artist.name}</summary><ArtistInfo artist={artist} /></details> : <ArtistInfo artist={artist} />}

        {!mobile && topSongsIsLoading &&
          (mobile ? <MobileArtistSongsLoading /> : <TopSongsTableFallback />)}
        {!mobile && topSongs && !topSongsIsLoading && (
          <ArtistTopSongs topSongs={topSongs} artist={artist} />
        )}

        {!mobile && recentAlbums.length > 0 && (
          <PreviewList
            title={t('artist.recentAlbums')}
            list={recentAlbums}
            moreTitle={t('album.more.discography')}
            moreRoute={ROUTES.ALBUMS.ARTIST(artist.id, artist.name)}
          />
        )}

        {artistInfoIsLoading && <PreviewListFallback />}
        {artistInfo?.similarArtist && !artistInfoIsLoading && (
          <RelatedArtistsList
            title={t('artist.relatedArtists')}
            similarArtists={artistInfo.similarArtist}
          />
        )}
      </ListWrapper>
    </div>
  )
}
