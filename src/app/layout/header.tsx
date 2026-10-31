import { NavigationButtons } from '@/app/components/header/navigation-buttons'
import { ChevronLeft } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { closeSonaAlbumToCover } from '@/app/components/sona/album-morph'
import { UserDropdown } from '@/app/components/header/user-dropdown'
import { SonaMobileAccount } from '@/app/components/sona/mobile-account'
import { HeaderSongInfo } from '@/app/components/header-song'
import { SettingsButton } from '@/app/components/settings/header-button'
import { MainSidebarTrigger } from '@/app/components/ui/main-sidebar'
import { useAppWindow } from '@/app/hooks/use-app-window'
import { isLinux, isMacOS, isWindows } from '@/utils/desktop'

export function Header() {
  const { isFullscreen } = useAppWindow()
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const albumId = /^\/library\/albums\/([^/]+)$/.exec(pathname)?.[1]
  const isNewTab = pathname + search === '/library/albums?filter=recentlyAdded'
  const mobileTitle = pathname === '/' ? 'Home'
    : pathname === '/mobile-library' ? 'Library'
    : pathname === '/mobile-request' ? 'Request'
    : isNewTab ? 'New'
    : pathname === '/library/albums' ? 'Albums'
    : pathname === '/library/artists' ? 'Artists'
    : pathname === '/library/songs' ? 'Songs'
    : pathname === '/library/radios' ? 'Radio'
    : pathname === '/library/playlists' ? 'Playlists'
    : pathname === '/library/favorites' ? 'Favorites'
    : pathname === '/library/podcasts' ? 'Podcasts'
    : pathname === '/library/genres' ? 'Genres'
    : 'Sona'

  return (
    <header className={'sona-header w-full grid grid-cols-[auto_minmax(0,1fr)_auto] md:grid-cols-header h-header px-3 md:px-4 fixed top-0 right-0 left-0 z-20 bg-background border-b electron-drag' + (albumId ? ' sona-header-album-view' : '')}>
      {albumId && <button className="sona-album-header-back md:hidden"
        type="button" aria-label="Back to music"
        onClick={() => closeSonaAlbumToCover(navigate, albumId)}>
        <ChevronLeft size={24} strokeWidth={2.3}/>
      </button>}
      <div className="flex items-center">
        {isMacOS && !isFullscreen && <div className="w-[70px]" />}
        <div className="sona-desktop-navigation"><NavigationButtons /></div>
        <MainSidebarTrigger className="sona-sidebar-trigger ml-2" />
      </div>
      <div className="hidden md:contents"><HeaderSongInfo /></div>
      <div className="sona-header-title-slot min-w-0 md:hidden">
        <h1 className="sona-header-page-title">{mobileTitle}</h1>
      </div>
      <div className="flex justify-end items-center gap-2">
        <div className="sona-desktop-settings"><SettingsButton /></div>
        <div className="sona-desktop-account"><UserDropdown /></div>
        <SonaMobileAccount />
        {isWindows && !isFullscreen && <div className="w-[122px]" />}
        {isLinux && !isFullscreen && <div className="w-[94px]" />}
      </div>
    </header>
  )
}
