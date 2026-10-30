import { Compass, House, Library, Radio, Search } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ROUTES } from '@/routes/routesList'

const tabs = [
  { key: 'home', label: 'Home', icon: House, url: ROUTES.LIBRARY.HOME },
  { key: 'new', label: 'New', icon: Compass, url: ROUTES.ALBUMS.RECENTLY_ADDED },
  { key: 'radio', label: 'Radio', icon: Radio, url: ROUTES.LIBRARY.RADIOS },
  { key: 'search', label: 'Search', icon: Search, url: '/mobile-search' },
  { key: 'library', label: 'Library', icon: Library, url: '/mobile-library' },
]

export function SonaMobileNavigation() {
  const navigate = useNavigate()
  const { pathname, search } = useLocation()

  const isActive = (key: string) => {
    if (key === 'home') return pathname === '/'
    if (key === 'new') return pathname + search === ROUTES.ALBUMS.RECENTLY_ADDED
    if (key === 'search') return pathname === '/mobile-search'
    if (key === 'radio') return pathname === ROUTES.LIBRARY.RADIOS
    if (key === 'library') return pathname === '/mobile-library' || (
      pathname.startsWith('/library') && !isActive('new') && !isActive('radio')
    )
    return false
  }

  return (
    <nav className="sona-bottom-nav" aria-label="Music navigation">
      {tabs.map(({ key, label, icon: Icon, url }) => (
        <button
          key={key}
          type="button"
          className={'sona-tab ' + (isActive(key) ? 'sona-tab-active' : '')}
          aria-label={label}
          aria-current={isActive(key) ? 'page' : undefined}
          onClick={() => navigate(url)}
        >
          <Icon size={22} strokeWidth={isActive(key) ? 2.6 : 1.8} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}
