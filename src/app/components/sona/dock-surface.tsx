import type { ReactNode } from 'react'

/** A fixed-size glass texture is clipped and translated; its contents never scale. */
export function DockSurface({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="sona-dock-shadow" aria-hidden="true" />
      <div className="sona-dock-surface">
        <div className="sona-dock-contents">{children}</div>
        <svg
          className="sona-dock-rim sona-dock-rim-left"
          viewBox="0 0 64 64"
          aria-hidden="true"
        >
          <circle cx="32" cy="32" r="31.5" vectorEffect="non-scaling-stroke" />
        </svg>
        <svg
          className="sona-dock-rim sona-dock-rim-right"
          viewBox="0 0 64 64"
          aria-hidden="true"
        >
          <circle cx="32" cy="32" r="31.5" vectorEffect="non-scaling-stroke" />
        </svg>
        <span
          className="sona-dock-rim-line sona-dock-rim-top"
          aria-hidden="true"
        />
        <span
          className="sona-dock-rim-line sona-dock-rim-bottom"
          aria-hidden="true"
        />
      </div>
    </>
  )
}
