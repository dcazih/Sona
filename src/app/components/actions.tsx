import { NativeHeartTap } from '@/app/components/sona/native-heart-tap'
import { isValidElement } from 'react'
import { SonaHeartGlyph } from '@/app/components/sona/heart-glyph'
import clsx from 'clsx'
import { EllipsisVertical, Info, Pause, Play, Shuffle } from 'lucide-react'
import { ButtonHTMLAttributes, ComponentPropsWithoutRef } from 'react'
import { Button as ComponentButton } from '@/app/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu'
import { SimpleTooltip } from '@/app/components/ui/simple-tooltip'
import { cn } from '@/lib/utils'

type ActionsContainerProps = ComponentPropsWithoutRef<'div'>

function Container({ children, className, ...rest }: ActionsContainerProps) {
  return (
    <div
      {...rest}
      className={cn('w-full mb-6 flex items-center gap-1', className)}
    >
      {children}
    </div>
  )
}

interface ActionsMainButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  tooltip?: string
  buttonStyle?: 'primary' | 'secondary'
  isActive?: boolean
}

function Button({
  children,
  tooltip,
  buttonStyle = 'secondary',
  className,
  isActive = false,
  ...props
}: ActionsMainButtonProps) {
  const visual = (
    <ComponentButton
      className={cn(
        'rounded-full w-14 h-14 ease-linear duration-100 transition relative',
        'border-[1px] border-transparent',
        buttonStyle === 'primary'
          ? 'hover:scale-105 mr-2'
          : 'hover:bg-foreground/20',
        className,
        isActive && 'pointer-events-none text-primary action-button-active',
      )}
      variant={buttonStyle === 'primary' ? 'default' : 'ghost'}
      {...props}
    >
      {children}
    </ComponentButton>
  )

  const heart =
    isValidElement<LikeIconProps>(children) && children.type === LikeIcon
  const button = tooltip ? (
    <SimpleTooltip text={tooltip}>{visual}</SimpleTooltip>
  ) : (
    visual
  )
  return heart ? (
    <NativeHeartTap
      active={Boolean(children.props.isStarred)}
      label={tooltip || 'Favorite'}
    >
      {button}
    </NativeHeartTap>
  ) : (
    button
  )
}

interface DropdownProps {
  tooltip: string
  options?: React.ReactNode
}

function Dropdown({ tooltip, options }: DropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        asChild
        className="outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-transparent focus:ring-transparent"
      >
        <ComponentButton
          className={clsx(
            'rounded-full w-14 h-14 border-transparent',
            'data-[state=open]:bg-foreground/20',
            'hover:bg-foreground/20',
            'ease-linear duration-100 transition',
          )}
          variant="ghost"
        >
          <SimpleTooltip text={tooltip}>
            <div className="min-w-14 h-14 rounded-full flex justify-center items-center">
              <EllipsisIcon />
            </div>
          </SimpleTooltip>
        </ComponentButton>
      </DropdownMenuTrigger>
      {options && (
        <DropdownMenuContent className="min-w-56" align="start">
          {options}
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  )
}

function PlayIcon() {
  return <Play className="w-5 h-5 fill-primary-foreground" strokeWidth={6} />
}

function PauseIcon() {
  return <Pause className="w-5 h-5 fill-primary-foreground" />
}

function ShuffleIcon() {
  return <Shuffle className="w-5 h-5 drop-shadow-md" strokeWidth={2} />
}

interface LikeIconProps {
  isStarred?: boolean
}

function LikeIcon({ isStarred }: LikeIconProps) {
  return <SonaHeartGlyph active={Boolean(isStarred)} size={20} />
}

function InfoIcon() {
  return <Info className="w-5 h-5 drop-shadow-md" strokeWidth={2} />
}

function EllipsisIcon() {
  return <EllipsisVertical className="w-5 h-5 drop-shadow-md" strokeWidth={2} />
}

export const Actions = {
  Container,
  Button,
  PlayIcon,
  PauseIcon,
  ShuffleIcon,
  LikeIcon,
  InfoIcon,
  EllipsisIcon,
  Dropdown,
}
