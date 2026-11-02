import { Star } from 'lucide-react'
import './heart-glyph.css'
export function SonaHeartGlyph({
  active,
  size = 24,
  className = '',
}: {
  active: boolean
  size?: number
  className?: string
}) {
  return (
    <span
      className={'sona-heart-glyph ' + className + (active ? ' is-filled' : '')}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Star size={size} />
      <Star size={size} className="sona-heart-fill" fill="currentColor" />
    </span>
  )
}
