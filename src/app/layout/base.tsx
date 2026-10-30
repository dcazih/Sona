import { memo } from 'react'
import { MainDrawerPage } from '@/app/components/drawer/page'
import { FullscreenMode } from '@/app/components/fullscreen/page'
import { Player } from '@/app/components/player/player'
import { CreatePlaylistDialog } from '@/app/components/playlist/form-dialog'
import { RemovePlaylistDialog } from '@/app/components/playlist/remove-dialog'
import { AppSidebar } from '@/app/components/sidebar/app-sidebar'
import { SongInfoDialog } from '@/app/components/song/info-dialog'
import {
  MainSidebarInset,
  MainSidebarProvider,
} from '@/app/components/ui/main-sidebar'
import { Header } from '@/app/layout/header'
import { usePlayerStore } from '@/store/player.store'
import { SonaMobileNavigation } from '@/app/components/sona/mobile-navigation'
import { MainRoutes } from './main'

const MemoHeader = memo(Header)
const MemoPlayer = memo(Player)
const MemoSongInfoDialog = memo(SongInfoDialog)
const MemoRemovePlaylistDialog = memo(RemovePlaylistDialog)
const MemoMainDrawerPage = memo(MainDrawerPage)
const MemoFullscreenMode = memo(FullscreenMode)

export default function BaseLayout() {
  const hasMedia = usePlayerStore((state) => Boolean(
    state.songlist.currentList.length || state.songlist.radioList.length || state.songlist.podcastList.length,
  ))
  return (
    <div className="sona-app-shell h-screen w-screen overflow-hidden" data-sona-has-media={hasMedia}>
      <MainSidebarProvider>
        <MemoHeader />
        <AppSidebar />
        <MainSidebarInset>
          <MainRoutes />
        </MainSidebarInset>
        <MemoPlayer />
        <SonaMobileNavigation />
      </MainSidebarProvider>
      <MemoSongInfoDialog />
      <MemoRemovePlaylistDialog />
      <MemoMainDrawerPage />
      <CreatePlaylistDialog />
      <MemoFullscreenMode />
    </div>
  )
}
