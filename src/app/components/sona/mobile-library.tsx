import { Album, ChevronRight, Disc3, Heart, ListMusic, Mic2, Music2, Podcast, Radio, Tags } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ROUTES } from '@/routes/routesList'

const pages = [
  { name: 'Playlists', icon: ListMusic, href: ROUTES.LIBRARY.PLAYLISTS },
  { name: 'Artists', icon: Mic2, href: ROUTES.LIBRARY.ARTISTS },
  { name: 'Albums', icon: Album, href: ROUTES.LIBRARY.ALBUMS },
  { name: 'Songs', icon: Music2, href: ROUTES.LIBRARY.SONGS },
  { name: 'Favorites', icon: Heart, href: ROUTES.LIBRARY.FAVORITES },
  { name: 'Genres', icon: Tags, href: ROUTES.LIBRARY.GENRES },
  { name: 'Podcasts', icon: Podcast, href: ROUTES.LIBRARY.PODCASTS },
  { name: 'Radio stations', icon: Radio, href: ROUTES.LIBRARY.RADIOS },
]

export default function SonaMobileLibrary() {
  return (
    <div className="sona-library-home">
      <p className="sona-eyebrow">YOUR MUSIC</p>
      <h1>Your Library</h1>
      <p className="sona-library-description">Everything you love, all in one place.</p>
      <div className="sona-library-links">
        {pages.map(({ name, icon: Icon, href }) => (
          <Link key={name} to={href} className="sona-library-link">
            <span className="sona-library-link-icon"><Icon size={23} /></span>
            <span>{name}</span>
            <ChevronRight className="sona-library-chevron" size={19} />
          </Link>
        ))}
      </div>
      <div className="sona-library-quick">
        <div className="sona-library-quick-title"><Disc3 size={18} /> Explore your music</div>
        <Link to={ROUTES.ALBUMS.RECENTLY_PLAYED}>Recently played <ChevronRight size={16} /></Link>
        <Link to={ROUTES.ALBUMS.RECENTLY_ADDED}>Recently added <ChevronRight size={16} /></Link>
        <Link to={ROUTES.ALBUMS.MOST_PLAYED}>Most played <ChevronRight size={16} /></Link>
      </div>
    </div>
  )
}
