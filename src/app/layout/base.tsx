import { memo, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
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
import { SonaReloadPlayback } from '@/app/components/sona/reload-playback'
import SonaMobileRequests from '@/app/components/sona/mobile-requests'

const MemoHeader = memo(Header)
const MemoPlayer = memo(Player)
const MemoSongInfoDialog = memo(SongInfoDialog)
const MemoRemovePlaylistDialog = memo(RemovePlaylistDialog)
const MemoMainDrawerPage = memo(MainDrawerPage)
const MemoFullscreenMode = memo(FullscreenMode)

export default function BaseLayout() {
  const { pathname } = useLocation()
  const requestsActive = pathname === '/mobile-request'
  const [requestsMounted, setRequestsMounted] = useState(requestsActive)
  useEffect(() => {
    if (requestsActive) setRequestsMounted(true)
  }, [requestsActive])
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
          {requestsMounted && <div className={'sona-persistent-requests' + (requestsActive ? ' is-active' : '')}
            aria-hidden={!requestsActive}>
            <SonaMobileRequests />
          </div>}
        </MainSidebarInset>
        <MemoPlayer />
        <SonaMobileNavigation />
      </MainSidebarProvider>
      <MemoSongInfoDialog />
      <MemoRemovePlaylistDialog />
      <MemoMainDrawerPage />
      <CreatePlaylistDialog />
      <MemoFullscreenMode />
      <SonaReloadPlayback />
    </div>
  )
}
