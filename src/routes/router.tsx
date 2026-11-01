import { lazy, Suspense } from 'react'
import { createHashRouter } from 'react-router-dom'

import {
  AlbumFallback,
  AlbumsFallback,
} from '@/app/components/fallbacks/album-fallbacks'
import { ArtistsFallback } from '@/app/components/fallbacks/artists.tsx'
import {
  GenreFallback,
  GenresFallback,
} from '@/app/components/fallbacks/genre-fallbacks'
import { HomeFallback } from '@/app/components/fallbacks/home-fallbacks'
import { PlaylistFallback } from '@/app/components/fallbacks/playlist-fallbacks'
import {
  EpisodeFallback,
  LatestEpisodesFallback,
  PodcastFallback,
} from '@/app/components/fallbacks/podcast-fallbacks'
import {
  InfinitySongListFallback,
  SongListFallback,
} from '@/app/components/fallbacks/song-fallbacks'
import { albumsLoader } from '@/routes/loaders/albumsLoader'
import { loginLoader } from '@/routes/loginLoader'
import { podcastsLoader, protectedLoader } from '@/routes/protectedLoader'
import { ROUTES } from '@/routes/routesList'
import Home from '@/app/pages/home'
import ErrorPage from '@/app/pages/error-page'
import SonaMobileLibrary from '@/app/components/sona/mobile-library'
import SonaMobileSearch from '@/app/components/sona/mobile-search'
import SonaMobileNew from '@/app/components/sona/mobile-new'
import SonaResponsive from '@/app/components/sona/mobile-responsive'
import { SonaArtistsList, SonaAlbumsList, SonaGenresList, SonaGenreDetail, SonaPlaylistsList, SonaPlaylistDetail, SonaSongsList, SonaDownloadsList } from '@/app/components/sona/mobile-section-pages'

const BaseLayout = lazy(() => import('@/app/layout/base'))
const Album = lazy(() => import('@/app/pages/albums/album'))
const AlbumsList = lazy(() => import('@/app/pages/albums/list'))
const Artist = lazy(() => import('@/app/pages/artists/artist'))
const ArtistsList = lazy(() => import('@/app/pages/artists/list'))

const Favorites = lazy(() => import('@/app/pages/favorites/songlist'))
const Login = lazy(() => import('@/app/pages/login'))
const PlaylistsPage = lazy(() => import('@/app/pages/playlists/list'))
const Playlist = lazy(() => import('@/app/pages/playlists/playlist'))
const Radios = lazy(() => import('@/app/pages/radios/radios-list'))
const SongList = lazy(() => import('@/app/pages/songs/songlist'))
const GenresList = lazy(() => import('@/app/pages/genres/list'))
const GenrePage = lazy(() => import('@/app/pages/genres/genre'))

const PodcastsList = lazy(() => import('@/app/pages/podcasts/list'))
const Podcast = lazy(() => import('@/app/pages/podcasts/podcast'))
const Episode = lazy(() => import('@/app/pages/podcasts/episode'))
const LatestEpisodes = lazy(
  () => import('@/app/pages/podcasts/latest-episodes'),
)

export const router = createHashRouter([
  {
    path: ROUTES.LIBRARY.HOME,
    element: <Suspense fallback={<HomeFallback />}><BaseLayout /></Suspense>,
    loader: protectedLoader,
    shouldRevalidate: () => false,
    children: [
      {
        id: 'home',
        path: ROUTES.LIBRARY.HOME,
        errorElement: <ErrorPage />,
        element: (
          <Suspense fallback={<HomeFallback />}>
            <Home />
          </Suspense>
        ),
      },
      {
        id: 'sona-mobile-library',
        path: '/mobile-library',
        element: (
          <Suspense fallback={<HomeFallback />}>
            <SonaMobileLibrary />
          </Suspense>
        ),
      },
      {
        id: 'sona-mobile-new',
        path: '/mobile-new',
        element: <SonaMobileNew />,
      },
      {
        id: 'sona-mobile-request',
        path: '/mobile-request',
        element: <div className="sona-request-route-anchor" />,
      },
      {
        id: 'sona-mobile-search',
        path: '/mobile-search',
        element: (
          <Suspense fallback={<HomeFallback />}>
            <SonaMobileSearch />
          </Suspense>
        ),
      },
      {
        id: 'sona-downloads',
        path: '/library/downloads',
        element: <SonaDownloadsList />,
      },
      {
        id: 'artists',
        path: ROUTES.LIBRARY.ARTISTS,
        errorElement: <ErrorPage />,
        element: (
          <Suspense fallback={<ArtistsFallback />}>
            <SonaResponsive mobile={<SonaArtistsList/>} desktop={<ArtistsList/>}/>
          </Suspense>
        ),
      },
      {
        id: 'songs',
        path: ROUTES.LIBRARY.SONGS,
        errorElement: <ErrorPage />,
        element: (
          <Suspense fallback={<InfinitySongListFallback />}>
            <SonaResponsive mobile={<SonaSongsList/>} desktop={<SongList/>}/>
          </Suspense>
        ),
      },
      {
        id: 'albums',
        path: ROUTES.LIBRARY.ALBUMS,
        loader: albumsLoader,
        errorElement: <ErrorPage />,
        element: (
          <Suspense fallback={<AlbumsFallback />}>
            <SonaResponsive mobile={<SonaAlbumsList/>} desktop={<AlbumsList/>}/>
          </Suspense>
        ),
      },
      {
        id: 'favorites',
        path: ROUTES.LIBRARY.FAVORITES,
        errorElement: <ErrorPage />,
        element: (
          <Suspense fallback={<InfinitySongListFallback />}>
            <Favorites />
          </Suspense>
        ),
      },
      {
        id: 'playlists',
        path: ROUTES.LIBRARY.PLAYLISTS,
        errorElement: <ErrorPage />,
        element: (
          <Suspense fallback={<SongListFallback />}>
            <SonaResponsive mobile={<SonaPlaylistsList/>} desktop={<PlaylistsPage/>}/>
          </Suspense>
        ),
      },
      {
        id: 'radios',
        path: ROUTES.LIBRARY.RADIOS,
        errorElement: <ErrorPage />,
        element: (
          <Suspense fallback={<SongListFallback />}>
            <Radios />
          </Suspense>
        ),
      },
      {
        id: 'genres',
        path: ROUTES.LIBRARY.GENRES,
        errorElement: <ErrorPage />,
        element: (
          <Suspense fallback={<GenresFallback />}>
            <SonaResponsive mobile={<SonaGenresList/>} desktop={<GenresList/>}/>
          </Suspense>
        ),
      },
      {
        id: 'genre',
        path: ROUTES.GENRE.PATH,
        errorElement: <ErrorPage />,
        element: (
          <Suspense fallback={<GenreFallback />}>
            <SonaResponsive mobile={<SonaGenreDetail/>} desktop={<GenrePage/>}/>
          </Suspense>
        ),
      },
      {
        id: 'artist',
        path: ROUTES.ARTIST.PATH,
        errorElement: <ErrorPage />,
        element: (
          <Suspense fallback={<AlbumFallback />}>
            <Artist />
          </Suspense>
        ),
      },
      {
        id: 'album',
        path: ROUTES.ALBUM.PATH,
        errorElement: <ErrorPage />,
        element: (
          <Suspense fallback={<AlbumFallback />}>
            <Album />
          </Suspense>
        ),
      },
      {
        id: 'playlist',
        path: ROUTES.PLAYLIST.PATH,
        errorElement: <ErrorPage />,
        element: (
          <Suspense fallback={<PlaylistFallback />}>
            <SonaResponsive mobile={<SonaPlaylistDetail/>} desktop={<Playlist/>}/>
          </Suspense>
        ),
      },
      {
        id: 'podcasts',
        path: ROUTES.LIBRARY.PODCASTS,
        errorElement: <ErrorPage />,
        loader: podcastsLoader,
        element: (
          <Suspense fallback={<AlbumsFallback />}>
            <PodcastsList />
          </Suspense>
        ),
      },
      {
        id: 'podcast',
        path: ROUTES.PODCASTS.PATH,
        errorElement: <ErrorPage />,
        loader: podcastsLoader,
        element: (
          <Suspense fallback={<PodcastFallback />}>
            <Podcast />
          </Suspense>
        ),
      },
      {
        id: 'episode',
        path: ROUTES.EPISODES.PATH,
        errorElement: <ErrorPage />,
        loader: podcastsLoader,
        element: (
          <Suspense fallback={<EpisodeFallback />}>
            <Episode />
          </Suspense>
        ),
      },
      {
        id: 'latest-episodes',
        path: ROUTES.EPISODES.LATEST,
        errorElement: <ErrorPage />,
        loader: podcastsLoader,
        element: (
          <Suspense fallback={<LatestEpisodesFallback />}>
            <LatestEpisodes />
          </Suspense>
        ),
      },
      {
        id: 'error',
        path: '*',
        element: (
          <Suspense>
            <ErrorPage />
          </Suspense>
        ),
      },
    ],
  },
  {
    id: 'login',
    path: ROUTES.SERVER_CONFIG,
    loader: loginLoader,
    element: (
      <Suspense>
        <Login />
      </Suspense>
    ),
  },
])
