import clsx from 'clsx'
import { memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { openSonaAlbumFromCover } from '@/app/components/sona/album-morph'
import { EqualizerBars } from '@/app/components/icons/equalizer-bars'
import { ArtworkImage } from '@/app/components/artwork-image'
import { ImageLoader } from '@/app/components/image-loader'
import { PreviewCard } from '@/app/components/preview-card/card'
import { ROUTES } from '@/routes/routesList'
import { subsonic } from '@/service/subsonic'
import { useIsAlbumPlaying, usePlayerActions } from '@/store/player.store'
import { Albums } from '@/types/responses/album'

type AlbumCardProps = {
  album: Albums
}

function AlbumCard({ album }: AlbumCardProps) {
  const { setSongList, togglePlayPause } = usePlayerActions()
  const navigate = useNavigate()
  const { isAlbumActive, isAlbumPlaying } = useIsAlbumPlaying(album.id)

  async function playCurrentAlbum() {
    const response = await subsonic.albums.getOne(album.id)

    if (response) {
      setSongList(response.song, 0, false, {
        id: response.id,
        name: response.name,
        type: 'album',
      })
    }
  }

  function handlePlayPause() {
    if (isAlbumActive) {
      togglePlayPause()
    } else {
      playCurrentAlbum()
    }
  }

  return (
    <PreviewCard.Root data-sona-album-id={album.id}>
      <PreviewCard.ImageWrapper link={ROUTES.ALBUM.PAGE(album.id)}
        onClick={(event) => {
          if (window.innerWidth >= 768 || event.defaultPrevented) return
          event.preventDefault()
          openSonaAlbumFromCover(event, navigate, album.id)
        }}>
        <ImageLoader id={album.coverArt} type="album" size={300}>
          {(src) => <ArtworkImage src={src} alt={album.name} loading="lazy"
            data-testid="card-image" />}
        </ImageLoader>
        {isAlbumPlaying ? (
          <PreviewCard.PauseButton onClick={handlePlayPause} />
        ) : (
          <PreviewCard.PlayButton onClick={handlePlayPause} />
        )}
      </PreviewCard.ImageWrapper>
      <PreviewCard.InfoWrapper>
        <div className="flex items-center gap-1">
          {isAlbumPlaying && (
            <EqualizerBars size={14} className="mb-0.5 text-primary" />
          )}
          <PreviewCard.Title
            link={ROUTES.ALBUM.PAGE(album.id)}
            onClick={(event) => {
              if (window.innerWidth >= 768 || event.defaultPrevented) return
              event.preventDefault()
              openSonaAlbumFromCover(event, navigate, album.id)
            }}
            className={clsx(isAlbumPlaying && 'text-primary')}
          >
            {album.name}
          </PreviewCard.Title>
        </div>
        <PreviewCard.Subtitle
          enableLink={album.artistId !== undefined}
          link={ROUTES.ARTIST.PAGE(album.artistId ?? '')}
        >
          {album.artist}
        </PreviewCard.Subtitle>
      </PreviewCard.InfoWrapper>
    </PreviewCard.Root>
  )
}

export const AlbumGridCard = memo(AlbumCard)
