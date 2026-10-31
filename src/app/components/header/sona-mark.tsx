import { useId, type SVGProps } from 'react'
import { SonaNoteGlyph } from './sona-note-glyph'

type Props = SVGProps<SVGSVGElement> & { size?: number }

/** Same double-note SVG everywhere: branding, login, Home and favicon. */
export function SonaMark({ size = 32, ...props }: Props) {
  const gradient = useId()
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size}
      viewBox="0 0 80 80" role="img" aria-label="Sona double music note" {...props}>
      <defs>
        <linearGradient id={gradient} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f0718c"/>
          <stop offset="58%" stopColor="#d34a6b"/>
          <stop offset="100%" stopColor="#b8395b"/>
        </linearGradient>
      </defs>
      <rect width="80" height="80" rx="21" fill={'url(#' + gradient + ')'}/>
      <SonaNoteGlyph x={8} y={8} width={64} height={64} color="#fff"/>
    </svg>
  )
}
