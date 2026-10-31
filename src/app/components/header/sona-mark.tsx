import type { SVGProps } from 'react'
type Props = SVGProps<SVGSVGElement> & { size?: number }
/** Shared Sona gradient logo. Matches the SVG favicon and PWA app icon. */
export function SonaMark({ size = 32, ...props }: Props) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 512 512" role="img" aria-label="Sona" {...props}>
    <defs><linearGradient id="sona-gradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#ff9385"/><stop offset="45%" stopColor="#ff315c"/><stop offset="100%" stopColor="#d60064"/></linearGradient><linearGradient id="sona-sheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#fff" stopOpacity=".15"/><stop offset="70%" stopColor="#fff" stopOpacity="0"/></linearGradient><clipPath id="sona-corners"><rect width="512" height="512" rx="116"/></clipPath></defs>
    <g clipPath="url(#sona-corners)"><rect width="512" height="512" fill="url(#sona-gradient)"/><path d="M0 0H512V114C381 118 292 194 214 254 140 312 67 301 0 309Z" fill="url(#sona-sheen)"/><path d="M0 428C166 459 322 352 512 275V512H0Z" fill="#c50060" opacity=".065"/></g>
    <g fill="#fff" transform="translate(51.2 51.2) scale(.64)"><path d="M182 182Q182 169 195 166L472 106Q488 102 488 119V382H431V191L239 234V430H182V182Z"/><ellipse cx="154" cy="432" rx="90" ry="67" transform="rotate(-10 154 432)"/><ellipse cx="404" cy="384" rx="90" ry="67" transform="rotate(-10 404 384)"/></g>
  </svg>
}
