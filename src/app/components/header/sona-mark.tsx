import { useId, type SVGProps } from 'react'
type Props = SVGProps<SVGSVGElement> & { size?: number }

/** Two distinct beamed music notes: the single-note icon must not return. */
export function SonaMark({ size = 32, ...props }: Props) {
  const gradId = useId()
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg"
      role="img" aria-label="Sona double music note" {...props}>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f0718c"/>
          <stop offset="58%" stopColor="#d34a6b"/>
          <stop offset="100%" stopColor="#b8395b"/>
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="80" height="80" rx="21" fill={'url(#' + gradId + ')'}/>
      <g fill="none" stroke="#fff" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round"
        transform="translate(7 7)">
        <path d="M26 48V19L57 12V42" />
        <path d="M26 19L57 12" strokeWidth="7.5"/>
        <ellipse cx="18" cy="50" rx="9.4" ry="6.3" fill="#fff" stroke="none"
          transform="rotate(-17 18 50)"/>
        <ellipse cx="49" cy="44" rx="9.4" ry="6.3" fill="#fff" stroke="none"
          transform="rotate(-17 49 44)"/>
      </g>
    </svg>
  )
}
