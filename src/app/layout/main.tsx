import { Component, useLayoutEffect, useRef, type ReactNode } from 'react'
import { useOutlet, useLocation } from 'react-router-dom'
import { useIsMobile } from '@/app/hooks/use-mobile'
import { ScrollArea } from '@/app/components/ui/scroll-area'
import { SonaImplicitRefresh } from '@/app/components/sona/mobile-refresh'
import { getMainScrollElement } from '@/utils/scrollPageToTop'

// Preserve the scroll of each route separately when navigating between
// Home, New, Request, Library and Search, including their nested pages.
const scrollPositions = new Map<string, number>()

/** Capture before React hides the old route and the browser clamps its viewport. */
class RouteScrollSnapshot extends Component<{ route: string; children: ReactNode }> {
  getSnapshotBeforeUpdate(previous: Readonly<{ route: string; children: ReactNode }>) {
    if (previous.route !== this.props.route) {
      const viewport = getMainScrollElement()
      if (viewport) scrollPositions.set(previous.route, viewport.scrollTop)
    }
    return null
  }
  componentDidUpdate() {}
  render() { return this.props.children }
}

export function MainRoutes() {
  const { pathname, search } = useLocation()
  const route = pathname + search
  const activeRoute = useRef(route)
  activeRoute.current = route
  const outlet = useOutlet()
  const mobile = useIsMobile()
  const home = useRef<ReactNode>(null)
  const cachedSearch = useRef<ReactNode>(null)
  if (mobile && pathname === '/mobile-search') cachedSearch.current = outlet
  if (mobile && pathname === '/') home.current = outlet

  useLayoutEffect(() => {
    const viewport = getMainScrollElement()
    if (!viewport) return
    // Preserve Search's scroll when returning from another tab or detail page.
    const resetOnEntry =
      pathname.startsWith('/catalog/') ||
      /^\/library\/albums\/[^/]+$/.test(pathname)
    const saved = resetOnEntry ? 0 : scrollPositions.get(route) || 0
    let lastTop = saved
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
      if (activeRoute.current === route && !restoring) { lastTop = viewport.scrollTop; scrollPositions.set(route, lastTop) }
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
      cancelAnimationFrame(frame)
      observer?.disconnect()
      viewport.removeEventListener('scroll', remember)
      viewport.removeEventListener('touchstart', stopRestore)
      viewport.removeEventListener('wheel', stopRestore)
    }
  }, [route])

  return (
    <RouteScrollSnapshot route={route}><main className="flex h-full">
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
            <div data-sona-cached-search aria-hidden={pathname !== '/mobile-search'}
              ref={node => { if (node) node.inert = pathname !== '/mobile-search' }}
              style={pathname === '/mobile-search' ? { position: 'relative', width: '100%' } : { position: 'absolute', width: '100%', height: 0, overflow: 'hidden', visibility: 'hidden', pointerEvents: 'none' }}>
              {cachedSearch.current}
            </div>
            {pathname !== '/' && pathname !== '/mobile-search' && outlet}
          </>
        ) : (
          outlet
        )}
      </ScrollArea>
      <SonaImplicitRefresh />
    </main></RouteScrollSnapshot>
  )
}
