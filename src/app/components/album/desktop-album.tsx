import { useTranslation } from 'react-i18next'
import ImageHeader from './image-header'
import { AlbumStickyHeader } from './sticky-header'
import { AlbumInfo } from './info'
import { DataTable } from '@/app/components/ui/data-table'
import type { BadgesData } from '@/app/components/header-info'
import { songsColumns } from '@/app/tables/songs-columns'
import { usePlayerActions } from '@/store/player.store'
import type { ColumnFilter } from '@/types/columnFilter'
import type { SingleAlbum } from '@/types/responses/album'
import { ROUTES } from '@/routes/routesList'
import { convertSecondsToHumanRead } from '@/utils/convertSecondsToTime'

export function DesktopAlbumHeader({ album }: { album: SingleAlbum }) {
  const { t } = useTranslation()
  const badges: BadgesData = [
    { content: album.year?.toString() ?? null, type: 'text' },
    { content: album.genre ?? null, type: 'link', link: ROUTES.ALBUMS.GENRE(album.genre) },
    { content: album.songCount ? t('playlist.songCount', { count: album.songCount }) : null, type: 'text' },
    { content: album.duration ? t('playlist.duration', { duration: convertSecondsToHumanRead(album.duration) }) : null, type: 'text' },
  ]
  return <>
    <AlbumStickyHeader album={album} />
    <div className="hidden md:block"><ImageHeader
      type={t('album.headline')} title={album.name} subtitle={album.artist}
      artistId={album.artistId} artists={album.artists} coverArtId={album.coverArt}
      coverArtType="album" coverArtSize="700" coverArtAlt={album.name}
      animatedArtworkArtist={album.artist} animatedArtworkAlbum={album.name} badges={badges}
    /></div>
  </>
}

const columnsToShow: ColumnFilter[] = ['trackNumber', 'title', 'duration', 'playCount', 'played', 'bitRate', 'contentType', 'select']

export function DesktopAlbumTracks({ album }: { album: SingleAlbum }) {
  const { setSongList } = usePlayerActions()
  return <>
    <div className="hidden md:block"><AlbumInfo album={album} /></div>
    <div className="hidden md:block"><DataTable
      columns={songsColumns()} data={album.song}
      handlePlaySong={(row) => setSongList(album.song, row.index, false, { id: album.id, name: album.name, type: 'album' })}
      columnFilter={columnsToShow} showDiscNumber variant="modern" enableVirtualization
    /></div>
  </>
}
