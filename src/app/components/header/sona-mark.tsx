import type { SVGProps } from 'react'
type Props = SVGProps<SVGSVGElement> & { size?: number }
/** Shared logo for Sona menus, header and login. */
export function SonaMark({ size = 32, ...props }: Props) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 512 512" role="img" aria-label="Sona" {...props}>
    <image href="/sona-icon-v13-192.png?v=13" width="512" height="512" />
  </svg>
}
