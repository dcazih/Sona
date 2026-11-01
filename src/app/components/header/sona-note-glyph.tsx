import type { SVGProps } from 'react'

export const SONA_NOTE_PATH =
  'M201 166Q201 151 216 148L367 114Q383 110 383 126V329Q383 371 341 384Q297 398 283 372Q265 340 306 322Q324 315 346 314V205L241 228V375Q241 418 200 430Q155 445 141 416Q124 384 165 366Q183 358 201 357Z'

type Props = SVGProps<SVGSVGElement> & { size?: number }

/** Sona's balanced double-note mark, shared by branding and player surfaces. */
export function SonaNoteGlyph({ size = 21, ...props }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path d={SONA_NOTE_PATH} />
    </svg>
  )
}
