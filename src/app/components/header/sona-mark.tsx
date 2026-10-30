import type { SVGProps } from 'react'

type Props = SVGProps<SVGSVGElement> & { size?: number }

/** Sona double-note mark, shared by the login, header and account sheet. */
export function SonaMark({ size = 32, ...props }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80"
      role="img" aria-label="Sona" xmlns="http://www.w3.org/2000/svg" {...props}>
      <defs>
        <linearGradient id="sona-mark-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f0718c" />
          <stop offset=".6" stopColor="#d34a6b" />
          <stop offset="1" stopColor="#b8395b" />
        </linearGradient>
      </defs>
      <rect width="80" height="80" rx="21" fill="url(#sona-mark-gradient)" />
      <g transform="translate(8 8) scale(1.3333)" fill="none" stroke="#fff"
        strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 32V12L36 8V28" />
        <ellipse cx="12.5" cy="34" rx="8" ry="5.5" fill="#fff"
          stroke="none" transform="rotate(-18 12.5 34)" />
        <ellipse cx="30.5" cy="29.5" rx="8" ry="5.5" fill="#fff"
          stroke="none" transform="rotate(-18 30.5 29.5)" />
      </g>
    </svg>
  )
}
