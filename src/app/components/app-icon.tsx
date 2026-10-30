import type { SVGProps } from 'react'
import { SonaMark } from '@/app/components/header/sona-mark'
import { cn } from '@/lib/utils'

type AppIconProps = SVGProps<SVGSVGElement> & { size?: number }

export function AppIcon({ size = 48, className, ...props }: AppIconProps) {
  return <SonaMark size={size} className={cn(className)} {...props}/>
}
