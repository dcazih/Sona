import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { useOutlet, useLocation } from 'react-router-dom'
import { useIsMobile } from '@/app/hooks/use-mobile'
import { ScrollArea } from '@/app/components/ui/scroll-area'
import { SonaImplicitRefresh } from '@/app/components/sona/mobile-refresh'
import { getMainScrollElement } from '@/utils/scrollPageToTop'

// Preserve the scroll of each route separately when navigating between
// Home, New, Request, Library and Search, including their nested pages.
const scrollPositions = new Map<string, number>()

export function MainRoutes() {
  const { pathname, search } = useLocation()
  const route = pathname + search
  const outlet = useOutlet()
  const mobile = useIsMobile()
  const home = useRef<ReactNode>(null)
  if (mobile && pathname === '/') home.current = outlet

  useLayoutEffect(() => {
    const viewport = getMainScrollElement()
    if (!viewport) return
    // Preserve Search's scroll when returning from another tab or detail page.
    const resetOnEntry =
      pathname.startsWith('/catalog/') ||
      /^\/library\/albums\/[^/]+$/.test(pathname)
    const saved = resetOnEntry ? 0 : scrollPositions.get(route) || 0
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
      <ScrollArea
        id="main-scroll-area"
        className="w-full bg-background-foreground"
      >
        {mobile ? (
          <>
            <div
              data-sona-cached-home
              aria-hidden={pathname !== '/'}
              ref={(node) => {
                if (node) node.inert = pathname !== '/'
              }}
              style={
                pathname === '/'
                  ? { position: 'relative', width: '100%' }
                  : {
                      position: 'absolute',
                      width: '100%',
                      height: 0,
                      overflow: 'hidden',
                      visibility: 'hidden',
                      pointerEvents: 'none',
                    }
              }
            >
              {home.current}
            </div>
            {pathname !== '/' && outlet}
          </>
        ) : (
          outlet
        )}
      </ScrollArea>
      <SonaImplicitRefresh />
    </main>
  )
}
