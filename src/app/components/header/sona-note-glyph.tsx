import type { SVGProps } from 'react'

type Props = SVGProps<SVGSVGElement> & { size?: number }

/** Sona's balanced double-note mark, shared by branding and player surfaces. */
export function SonaNoteGlyph({ size = 21, ...props }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 640 640" fill="currentColor"
      xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M182 182Q182 169 195 166L472 106Q488 102 488 119V382H431V191L239 234V430H182V182Z" />
      <ellipse cx="154" cy="432" rx="90" ry="67" transform="rotate(-10 154 432)" />
      <ellipse cx="404" cy="384" rx="90" ry="67" transform="rotate(-10 404 384)" />
    </svg>
  )
}
