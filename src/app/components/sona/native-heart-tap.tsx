import { useIsMobile } from '@/app/hooks/use-mobile'
import type { ReactElement } from 'react'
import './heart-glyph.css'
/** A real switch tap provides WebKit haptics; the original button owns the action. */
export function NativeHeartTap({
  active,
  label,
  children,
}: {
  active: boolean
  label: string
  children: ReactElement
}) {
  const mobile = useIsMobile()
  if (!mobile) return children
  return (
    <span className="sona-native-heart-tap">
      {children}
      <input
        ref={(node) => node?.setAttribute('switch', '')}
        type="checkbox"
        checked={active}
        aria-label={label}
        onChange={(event) =>
          event.currentTarget.parentElement?.querySelector('button')?.click()
        }
      />
    </span>
  )
}
