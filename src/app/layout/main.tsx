import { useLayoutEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { ScrollArea } from '@/app/components/ui/scroll-area'
import { SonaImplicitRefresh } from '@/app/components/sona/mobile-refresh'
import { getMainScrollElement } from '@/utils/scrollPageToTop'

// Preserve the scroll of each route separately when navigating between
// Home, New, Request, Library and Search, including their nested pages.
const scrollPositions = new Map<string, number>()

export function MainRoutes() {
  const { pathname, search } = useLocation()
  const route = pathname + search

  useLayoutEffect(() => {
    const viewport = getMainScrollElement()
    if (!viewport) return
    const saved = scrollPositions.get(route) || 0
    let restoring = saved > 0
    let touched = false
    let frame = 0
    let observer: ResizeObserver | undefined

    const restore = () => {
      if (!restoring || touched) return
      viewport.scrollTop = saved
      if (Math.abs(viewport.scrollTop - saved) <= 2) {
        restoring = false
        observer?.disconnect()
      }
    }

    const remember = () => {
      if (!restoring) scrollPositions.set(route, viewport.scrollTop)
    }
    const stopRestore = () => {
      touched = true
      restoring = false
      observer?.disconnect()
    }
    if (!restoring) viewport.scrollTop = 0
    else {
      restore()
      observer = new ResizeObserver(() => {
        cancelAnimationFrame(frame)
        frame = requestAnimationFrame(restore)
      })
      const content = viewport.firstElementChild
      if (content) observer.observe(content)
      frame = requestAnimationFrame(restore)
    }
    viewport.addEventListener('scroll', remember, { passive: true })
    viewport.addEventListener('touchstart', stopRestore, { passive: true })
    viewport.addEventListener('wheel', stopRestore, { passive: true })
    return () => {
      scrollPositions.set(route, restoring ? saved : viewport.scrollTop)
      cancelAnimationFrame(frame)
      observer?.disconnect()
      viewport.removeEventListener('scroll', remember)
      viewport.removeEventListener('touchstart', stopRestore)
      viewport.removeEventListener('wheel', stopRestore)
    }
  }, [route])

  return (
    <main className="flex h-full">
      <ScrollArea id="main-scroll-area" className="w-full bg-background-foreground">
        <Outlet />
      </ScrollArea>
      <SonaImplicitRefresh />
    </main>
  )
}
