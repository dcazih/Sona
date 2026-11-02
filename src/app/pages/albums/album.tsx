import { useDetailArtwork } from '@/app/hooks/use-detail-artwork'
import { getImmediateCoverArtUrl } from '@/api/httpClient'
import { lazy, Suspense } from 'react'
import { useIsMobile } from '@/app/hooks/use-mobile'
import { useMobileDetailReveal } from '@/app/hooks/use-mobile-detail-reveal'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { AlbumComment } from '@/app/components/album/comment'
import { RecordLabelsInfo } from '@/app/components/album/record-labels'
import { AlbumFallback, AlbumHeaderFallback } from '@/app/components/fallbacks/album-fallbacks'
import { TableFallback } from '@/app/components/fallbacks/table-fallbacks'
import { PreviewListFallback } from '@/app/components/fallbacks/home-fallbacks'
import PreviewList from '@/app/components/home/preview-list'
import ListWrapper from '@/app/components/list-wrapper'
import { SonaMobileAlbumTracks } from '@/app/components/sona/mobile-album-tracks'
import { SonaMobileAlbumHero } from '@/app/components/sona/mobile-album-hero'
import {
  useGetAlbum,
  useGetArtistAlbums,
  useGetGenreAlbums,
} from '@/app/hooks/use-album'
import ErrorPage from '@/app/pages/error-page'
import { ROUTES } from '@/routes/routesList'
import { Albums } from '@/types/responses/album'
import { sortRecentAlbums } from '@/utils/album'

const DesktopHeader = lazy(() => import('@/app/components/album/desktop-album').then(module => ({ default: module.DesktopAlbumHeader })))
const DesktopTracks = lazy(() => import('@/app/components/album/desktop-album').then(module => ({ default: module.DesktopAlbumTracks })))

export default function Album() {
  const isMobile = useIsMobile()
  const { albumId } = useParams() as { albumId: string }
  const { t } = useTranslation()

  const {
    data: album,
    isLoading: albumIsLoading,
    isFetched,
  } = useGetAlbum(albumId)
  const { data: artist, isLoading: moreAlbumsIsLoading } = useGetArtistAlbums(
    album?.artistId || '',
  )
  const { data: randomAlbums, isLoading: randomAlbumsIsLoading } =
    useGetGenreAlbums(album?.genre || '')

  const moreAlbums = artist?.album
  const artworkReady = useDetailArtwork(album?.coverArt ? getImmediateCoverArtUrl(album.coverArt, 'album', '700') : undefined)
  const showBlack = useMobileDetailReveal(albumId, albumIsLoading || !artworkReady)

  if (showBlack && isMobile) return <div className="sona-detail-black" aria-label="Loading album" />
  if (albumIsLoading || !artworkReady) return <AlbumFallback />
  if (isFetched && !album) {
    return <ErrorPage status={404} statusText="Not Found" />
  }
  if (!album) return <AlbumFallback />

  function removeCurrentAlbumFromList(moreAlbums: Albums[], sort = false) {
    if (moreAlbums.length === 0 || !album) return null

    let list = moreAlbums.filter((item) => item.id !== album.id)

    if (sort) {
      list = sortRecentAlbums(list)
    }

    if (list.length > 16) list = list.slice(0, 16)

    if (list.length === 0) return null

    return list
  }

  const artistAlbums = moreAlbums
    ? removeCurrentAlbumFromList(moreAlbums, true)
    : null

  const randomGenreAlbums =
    randomAlbums?.list && album.genre
      ? removeCurrentAlbumFromList(randomAlbums.list)
      : null

  const albumComment = album.song.length > 0 ? album.song[0].comment : null

  return (
    <div className="sona-album-page w-full relative">
      {isMobile
        ? <div className="md:hidden"><SonaMobileAlbumHero album={album} /></div>
        : <Suspense fallback={<AlbumHeaderFallback />}><DesktopHeader album={album} /></Suspense>}

      <ListWrapper>
        {isMobile
          ? <div className="md:hidden"><SonaMobileAlbumTracks album={album} /></div>
          : <Suspense fallback={<TableFallback variant="modern" />}><DesktopTracks album={album} /></Suspense>}

        {albumComment && <AlbumComment comment={albumComment} />}

        <RecordLabelsInfo album={album} />

        <div className="mt-4">
          {moreAlbumsIsLoading && <PreviewListFallback />}
          {artistAlbums && !moreAlbumsIsLoading && album.artistId && (
            <PreviewList
              list={artistAlbums}
              showMore={true}
              title={t('album.more.listTitle')}
              moreTitle={t('album.more.discography')}
              moreRoute={ROUTES.ALBUMS.ARTIST(album.artistId, album.artist)}
            />
          )}

          {randomAlbumsIsLoading && <PreviewListFallback />}
          {!randomAlbumsIsLoading && randomGenreAlbums && (
            <PreviewList
              list={randomGenreAlbums}
              moreRoute={ROUTES.ALBUMS.GENRE(album.genre)}
              title={t('album.more.genreTitle', {
                genre: album.genre,
              })}
            />
          )}
        </div>
      </ListWrapper>
    </div>
  )
}
