import type { SVGProps } from 'react'
type Props = SVGProps<SVGSVGElement> & { size?: number }

/** Standalone double-note glyph used for playing tracks and missing artwork. */
export function SonaNoteGlyph({ size = 21, ...props }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none"
      xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <g stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M24 48V19L55 12V42"/>
        <path d="M24 19L55 12" strokeWidth="7"/>
        <ellipse cx="16" cy="50" rx="9.5" ry="6.4" transform="rotate(-17 16 50)"
          fill="currentColor" stroke="none"/>
        <ellipse cx="47" cy="44" rx="9.5" ry="6.4" transform="rotate(-17 47 44)"
          fill="currentColor" stroke="none"/>
      </g>
    </svg>
  )
}
