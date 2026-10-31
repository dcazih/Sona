import { NavigationButtons } from '@/app/components/header/navigation-buttons'
import { Check, ChevronLeft, Ellipsis } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
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
  const isLibraryTab = pathname === '/mobile-library'
  const [libraryMenuOpen, setLibraryMenuOpen] = useState(false)
  const [editingLibrary, setEditingLibrary] = useState(false)
  const libraryControlRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLibraryMenuOpen(false)
    if (!isLibraryTab) setEditingLibrary(false)
  }, [isLibraryTab])

  useEffect(() => {
    const listener = (event: Event) =>
      setEditingLibrary(Boolean((event as CustomEvent<boolean>).detail))
    window.addEventListener('sona:library-edit-state', listener)
    return () => window.removeEventListener('sona:library-edit-state', listener)
  }, [])

  useEffect(() => {
    if (!libraryMenuOpen) return
    const handleOutside = (event: PointerEvent) => {
      if (!libraryControlRef.current?.contains(event.target as Node)) setLibraryMenuOpen(false)
    }
    document.addEventListener('pointerdown', handleOutside)
    return () => document.removeEventListener('pointerdown', handleOutside)
  }, [libraryMenuOpen])
  const albumId = /^\/library\/albums\/([^/]+)$/.exec(pathname)?.[1]
  const artistId = /^\/library\/artists\/([^/]+)$/.exec(pathname)?.[1]
  const isMobileDetail = Boolean(albumId || artistId)
  const isNewTab = pathname + search === '/library/albums?filter=newest'
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
    <header className={'sona-header w-full grid grid-cols-[auto_minmax(0,1fr)_auto] md:grid-cols-header h-header px-3 md:px-4 fixed top-0 right-0 left-0 z-20 bg-background border-b electron-drag' + (isMobileDetail ? ' sona-header-detail-view' : '') + (albumId ? ' sona-header-album-view' : '')}>
      {isMobileDetail && <button className="sona-album-header-back md:hidden"
        type="button" aria-label="Back to music"
        onClick={() => albumId ? closeSonaAlbumToCover(navigate, albumId) : navigate(-1)}>
        <ChevronLeft size={24} strokeWidth={2.3}/>
      </button>}
      {albumId && <button className="sona-album-header-more md:hidden" type="button"
        aria-label="Album options" onClick={() => document.getElementById('sona-mobile-album-options')?.click()}>
        <Ellipsis size={25} strokeWidth={2.4}/>
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
        <div ref={libraryControlRef}
          className={'sona-library-header-control md:hidden' + (isLibraryTab ? ' is-visible' : '')}>
          <button type="button" className="sona-library-header-button"
            aria-label={editingLibrary ? 'Save library sections' : 'Library options'}
            aria-expanded={editingLibrary ? undefined : libraryMenuOpen}
            tabIndex={isLibraryTab ? 0 : -1}
            onClick={() => {
              if (editingLibrary) {
                window.dispatchEvent(new CustomEvent('sona:library-edit-request', { detail: 'save' }))
              } else {
                setLibraryMenuOpen(open => !open)
              }
            }}>
            {editingLibrary ? <Check size={23} strokeWidth={2.6}/> : <Ellipsis size={24} strokeWidth={2.6}/>}
          </button>
          {isLibraryTab && libraryMenuOpen && !editingLibrary &&
            <div className="sona-library-header-menu" role="menu">
              <button type="button" role="menuitem" onClick={() => {
                setLibraryMenuOpen(false)
                window.dispatchEvent(new CustomEvent('sona:library-edit-request', { detail: 'start' }))
              }}>Edit Sections</button>
            </div>}
        </div>
        <SonaMobileAccount />
        {isWindows && !isFullscreen && <div className="w-[122px]" />}
        {isLinux && !isFullscreen && <div className="w-[94px]" />}
      </div>
    </header>
  )
}
