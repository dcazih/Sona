import { ArrowUpRight, CirclePlus, Headphones, Search } from 'lucide-react'
import { Link } from 'react-router-dom'

const DISCOVERY_URL = 'https://discover.hippocampus-polaris.ts.net'

/**
 * The family request portal already owns per-user authentication and download
 * authorization. Do not send Navidrome passwords from the Sona browser to it.
 */
export default function SonaMobileRequests() {
  return (
    <div className="sona-request-page">
      <p className="sona-request-eyebrow">YOUR MUSIC</p>
      <h1>Request</h1>
      <p className="sona-request-subtitle">
        Missing something? Search the family request portal.
      </p>
      <div className="sona-request-main-card">
        <div className="sona-request-icon"><CirclePlus size={30} strokeWidth={1.7}/></div>
        <h2>Find your next favorite.</h2>
        <p>Search for an artist, song, or album. Your requests are handled by the connected music request service.</p>
        <a className="sona-request-open" href={DISCOVERY_URL} target="_blank" rel="noopener noreferrer">
          Open Music Requests <ArrowUpRight size={19} />
        </a>
      </div>
      <div className="sona-request-secondary">
        <Link to="/mobile-search"><Search size={19} />
          <span>Search songs already in your library</span><ArrowUpRight size={18}/></Link>
        <div className="sona-request-note">
          <Headphones size={19}/>
          <span>Connect to your family Tailscale network to access the private request portal.</span>
        </div>
      </div>
    </div>
  )
}
