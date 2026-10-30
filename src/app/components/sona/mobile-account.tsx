import { LogOut, Settings, UserRound } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu'
import { useAppData, useAppSettings, useAppStore } from '@/store/app.store'

export function SonaMobileAccount() {
  const { username, url, lockUser } = useAppData()
  const { setOpenDialog } = useAppSettings()
  const setLogoutDialogState = useAppStore((state) => state.actions.setLogoutDialogState)
  return (
    <div className="sona-mobile-account">
      <DropdownMenu>
        <DropdownMenuTrigger aria-label="Account" className="sona-account-trigger">
          {username ? username.slice(0, 1).toUpperCase() : <UserRound size={19} />}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className="sona-mobile-account-menu">
          <DropdownMenuLabel className="sona-account-label">
            <strong>{username || 'Your account'}</strong>
            <span>{url || 'Navidrome'}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setOpenDialog(true)}>
            <Settings size={18} className="mr-2" />
            Settings
          </DropdownMenuItem>
          {!lockUser && (
            <DropdownMenuItem onSelect={() => setLogoutDialogState(true)}>
              <LogOut size={18} className="mr-2" />
              Log out
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
