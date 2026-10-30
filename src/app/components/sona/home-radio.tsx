import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight, Radio } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ROUTES } from '@/routes/routesList'
import { subsonic } from '@/service/subsonic'

/** Keep Radio discoverable on Home even though Request owns its former tab. */
export function SonaHomeRadio() {
  const { data: stations = [] } = useQuery({
    queryKey: ['sona-home-radio'],
    queryFn: subsonic.radios.getAll,
    staleTime: 60000,
  })
  return (
    <section className="sona-home-radio" aria-label="Internet radio">
      <div className="sona-home-radio-heading">
        <h2>Radio</h2>
        <Link to={ROUTES.LIBRARY.RADIOS} aria-label="All radio stations">
          See All <ArrowUpRight size={17}/>
        </Link>
      </div>
      {stations.length ? (
        <div className="sona-home-radio-list">
          {stations.slice(0, 5).map((station) => (
            <Link to={ROUTES.LIBRARY.RADIOS} key={station.id}
              className="sona-home-radio-station">
              <span className="sona-home-radio-icon"><Radio size={22}/></span>
              <span>{station.name}</span>
            </Link>
          ))}
        </div>
      ) : (
        <Link to={ROUTES.LIBRARY.RADIOS} className="sona-home-radio-empty">
          <Radio size={25}/>
          <span>Browse and add radio stations</span>
          <ArrowUpRight size={18}/>
        </Link>
      )}
    </section>
  )
}
