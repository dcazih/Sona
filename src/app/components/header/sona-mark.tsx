import { useId, type SVGProps } from 'react'
import { SonaNoteGlyph } from './sona-note-glyph'

type Props = SVGProps<SVGSVGElement> & { size?: number }

/** Same continuous-corner double-note mark everywhere in the Sona interface. */
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
      <path d="M40 0C17.9 0 9.2 0 4.6 4.6S0 17.9 0 40s0 30.8 4.6 35.4S17.9 80 40 80s30.8 0 35.4-4.6S80 62.1 80 40s0-30.8-4.6-35.4S62.1 0 40 0Z" fill={'url(#' + gradient + ')'}/>
      <SonaNoteGlyph x={8} y={8} width={64} height={64} color="#fff"/>
    </svg>
  )
}
