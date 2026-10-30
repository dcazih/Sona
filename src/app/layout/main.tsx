import { useEffect } from 'react'
import { Location, Outlet, useLocation } from 'react-router-dom'
import { ScrollArea } from '@/app/components/ui/scroll-area'
import { SonaPullToRefresh } from '@/app/components/sona/mobile-refresh'
import { scrollPageToTop } from '@/utils/scrollPageToTop'

export function MainRoutes() {
  const { pathname } = useLocation() as Location

  useEffect(() => {
    if (pathname) scrollPageToTop()
  }, [pathname])

  return (
    <main className="flex h-full">
      <ScrollArea
        id="main-scroll-area"
        className="w-full bg-background-foreground"
      >
        <Outlet />
      </ScrollArea>
      <SonaPullToRefresh />
    </main>
  )
}
