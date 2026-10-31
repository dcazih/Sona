import { Compass, House, Library, ListPlus, Mic, Search, X } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ROUTES } from '@/routes/routesList'
import { getMainScrollElement } from '@/utils/scrollPageToTop'
import { useSonaSearch } from './search-state'

const tabs = [
  { key: 'home', label: 'Sona', icon: House, url: ROUTES.LIBRARY.HOME },
  { key: 'new', label: 'New', icon: Compass, url: ROUTES.ALBUMS.RECENTLY_ADDED },
  { key: 'request', label: 'Request', icon: ListPlus, url: '/mobile-request' },
  { key: 'library', label: 'Library', icon: Library, url: '/mobile-library' },
] as const

type Recognition = {
  lang: string
  interimResults: boolean
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: (() => void) | null
  start: () => void
  stop: () => void
}
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition
  webkitSpeechRecognition?: new () => Recognition
}
type Swipe = { pointerId: number; startX: number; startY: number; moved: boolean; index: number }

export function SonaMobileNavigation() {
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  const isSearch = pathname === '/mobile-search'
  const inputRef = useRef<HTMLInputElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const swipeRef = useRef<Swipe | null>(null)
  const blockClickUntil = useRef(0)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragPosition, setDragPosition] = useState<number | null>(null)
  const [, setKeyboardVisible] = useState(false)
  const [, setKeyboardClosing] = useState(false)
  const [voiceError, setVoiceError] = useState('')
  const recognition = useRef<Recognition | null>(null)
  const term = useSonaSearch((state) => state.term)
  const focused = useSonaSearch((state) => state.focused)
  const setTerm = useSonaSearch((state) => state.setTerm)
  const setFocused = useSonaSearch((state) => state.setFocused)
  const setEngaged = useSonaSearch((state) => state.setEngaged)
  const reset = useSonaSearch((state) => state.reset)

  function indexForPath(): number {
    if (pathname === '/') return 0
    if (pathname + search === ROUTES.ALBUMS.RECENTLY_ADDED) return 1
    if (pathname === '/mobile-request') return 2
    if (pathname === '/mobile-library' || pathname.startsWith('/library')) return 3
    return -1
  }
  const selectedIndex = dragIndex ?? indexForPath()

  useEffect(() => {
    if (window.innerWidth >= 768) return
    const root = document.documentElement
    const tabColor = '#000000'
    root.style.setProperty('--sona-tab-notch-color', tabColor)
    if (root.dataset.sonaNotchOwner !== 'player' &&
        !root.style.getPropertyValue('--sona-album-notch-color')) {
      root.style.setProperty('--sona-notch-color', tabColor)
      document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', tabColor)
    }
  }, [pathname, isSearch])

  function leaveSearch() {
    inputRef.current?.blur()
    recognition.current?.stop()
    setFocused(false)
    setVoiceError('')
    reset()
  }
  function goTo(url: string) {
    leaveSearch()
    navigate(url)
  }

  function getIndexFromX(x: number): number {
    const box = navRef.current?.getBoundingClientRect()
    if (!box) return 0
    return Math.max(0, Math.min(tabs.length - 1, Math.floor((x - box.left) / box.width * tabs.length)))
  }
  function positionFromX(x: number): number {
    const box = navRef.current?.getBoundingClientRect()
    if (!box) return 0
    const fraction = (x - box.left - 4) / Math.max(1, box.width - 8)
    return Math.max(0, Math.min(tabs.length - 1, fraction * tabs.length - 0.5))
  }
  function navStart(event: ReactPointerEvent<HTMLElement>) {
    if (!event.isPrimary || isSearch || (event.pointerType === 'mouse' && event.button !== 0)) return
    swipeRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX, startY: event.clientY,
      moved: false, index: getIndexFromX(event.clientX),
    }
  }
  function navMove(event: ReactPointerEvent<HTMLElement>) {
    const swipe = swipeRef.current
    if (!swipe || swipe.pointerId !== event.pointerId) return
    const dx = event.clientX - swipe.startX
    const dy = event.clientY - swipe.startY
    if (!swipe.moved && Math.abs(dy) > Math.abs(dx) * 1.3) {
      swipeRef.current = null
      setDragIndex(null)
      setDragPosition(null)
      return
    }
    if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) {
      if (!swipe.moved) {
        swipe.moved = true
        event.currentTarget.setPointerCapture(event.pointerId)
      }
      const position = positionFromX(event.clientX)
      swipe.index = Math.round(position)
      setDragPosition(position)
      setDragIndex(swipe.index)
      if (event.cancelable) event.preventDefault()
    }
  }
  function navEnd(event: ReactPointerEvent<HTMLElement>) {
    const swipe = swipeRef.current
    if (!swipe || swipe.pointerId !== event.pointerId) return
    swipeRef.current = null
    setDragPosition(null)
    setDragIndex(null)
    if (swipe.moved) {
      blockClickUntil.current = Date.now() + 400
      goTo(tabs[swipe.index].url)
    }
  }
  function navCancel() {
    swipeRef.current = null
    setDragIndex(null)
    setDragPosition(null)
  }
  function tabClick(url: string) {
    if (Date.now() < blockClickUntil.current) return
    goTo(url)
  }

  useEffect(() => {
    if (!isSearch) {
      recognition.current?.stop()
      setKeyboardVisible(false)
      setFocused(false)
    }
  }, [isSearch, setFocused])

  useEffect(() => {
    if (!isSearch || !focused) return
    const viewport = getMainScrollElement()
    if (!viewport) return
    let startX = 0
    let startY = 0
    let dismissed = false
    const start = (event: globalThis.TouchEvent) => {
      const touch = event.touches[0]
      startX = touch.clientX
      startY = touch.clientY
      dismissed = false
    }
    const move = (event: globalThis.TouchEvent) => {
      if (dismissed || event.touches.length !== 1) return
      const touch = event.touches[0]
      const dx = touch.clientX - startX
      const dy = touch.clientY - startY
      if (Math.abs(dy) < 8 || Math.abs(dy) < Math.abs(dx) * 1.2) return
      dismissed = true
      setKeyboardClosing(true)
      inputRef.current?.blur()
      setFocused(false)
    }
    viewport.addEventListener('touchstart', start, { passive: true })
    viewport.addEventListener('touchmove', move, { passive: true })
    return () => {
      viewport.removeEventListener('touchstart', start)
      viewport.removeEventListener('touchmove', move)
    }
  }, [isSearch, focused, setFocused])

  useEffect(() => {
    const vp = window.visualViewport
    const root = document.documentElement
    if (!isSearch) {
      setKeyboardVisible(false)
      setKeyboardClosing(false)
      root.style.removeProperty('--sona-visual-bottom')
      root.style.removeProperty('--sona-visual-height')
      root.style.removeProperty('--sona-visual-top')
      root.style.removeProperty('--sona-keyboard-offset')
      root.style.removeProperty('--sona-keyboard-bottom-offset')
      return
    }
    let frame = 0
    let keyboardSettleTimer = 0
    let previousKeyboardHeight = 0
    // Track the visual viewport itself, not only the difference between
    // window.innerHeight and viewport.height. Safari can resize both while
    // raising its keyboard, which previously made the offset appear zero.
    let baseline = Math.max(window.innerHeight, vp?.height || 0)
    root.style.setProperty('--sona-layout-height', Math.round(baseline) + 'px')
    const update = () => {
      if (frame) cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const visual = window.visualViewport
        const top = visual?.offsetTop || 0
        const height = visual?.height || window.innerHeight
        if (height > baseline) baseline = height
        const keyboardHeight = Math.max(0, baseline - height)
        root.style.setProperty('--sona-visual-bottom', Math.round(top + height) + 'px')
        root.style.setProperty('--sona-visual-height', Math.round(height) + 'px')
        root.style.setProperty('--sona-visual-top', Math.round(top) + 'px')
        root.style.setProperty('--sona-keyboard-offset', Math.round(keyboardHeight) + 'px')
        // The dock is fixed to the layout viewport. Account for both keyboard
        // height and Safari's visual-viewport pan so it sits at the keyboard's
        // actual top edge instead of being offset twice.
        const keyboardBottomOffset = Math.max(0, baseline - (top + height))
        root.style.setProperty('--sona-keyboard-bottom-offset', Math.round(keyboardBottomOffset) + 'px')
        window.clearTimeout(keyboardSettleTimer)
        if (keyboardHeight > 100) {
          if (previousKeyboardHeight > 100 && keyboardHeight < previousKeyboardHeight - 8) {
            setKeyboardClosing(true)
                }
          // Wait for VisualViewport to stop changing before the short reveal
          // begins after the keyboard has finished mounting.
          keyboardSettleTimer = window.setTimeout(
            () => {
              setKeyboardVisible(true)
              setKeyboardClosing(false)
            },
            160,
          )
        } else {
          keyboardSettleTimer = window.setTimeout(() => {
            setKeyboardVisible(false)
            setKeyboardClosing(false)
          }, 120)
        }
        previousKeyboardHeight = keyboardHeight
        frame = 0
      })
    }
    update()
    vp?.addEventListener('resize', update)
    vp?.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.clearTimeout(keyboardSettleTimer)
      vp?.removeEventListener('resize', update)
      vp?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
      root.style.removeProperty('--sona-visual-bottom')
      root.style.removeProperty('--sona-visual-height')
      root.style.removeProperty('--sona-visual-top')
      root.style.removeProperty('--sona-keyboard-offset')
      root.style.removeProperty('--sona-keyboard-bottom-offset')
      root.style.removeProperty('--sona-layout-height')
    }
  }, [isSearch])

  function startVoiceSearch() {
    const w = window as SpeechWindow
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setVoiceError('Voice search is not supported by this browser.')
      return
    }
    try {
      recognition.current?.stop()
      const r = new SpeechRecognition()
      recognition.current = r
      r.lang = navigator.language || 'en-US'
      r.interimResults = false
      r.onresult = (event) => {
        setTerm(event.results[0][0].transcript)
        inputRef.current?.focus()
        setVoiceError('')
      }
      r.onerror = () => setVoiceError('Microphone permission is needed for voice search.')
      r.start()
    } catch {
      setVoiceError('Voice search could not start.')
    }
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault()
    const value = term.trim()
    if (!value) return
    setEngaged(true)
    window.dispatchEvent(new CustomEvent('sona-search-submit', { detail: value }))
    inputRef.current?.blur()
    setFocused(false)
  }

  return (
    <>
      <nav
        ref={navRef}
        className={'sona-bottom-nav sona-bottom-nav-split' + (isSearch ? ' is-searching' : '') + (dragIndex !== null ? ' is-dragging' : '')}
        aria-label="Music navigation"
        style={{ '--sona-nav-index': selectedIndex < 0 ? 0 : selectedIndex, '--sona-nav-progress': dragPosition ?? (selectedIndex < 0 ? 0 : selectedIndex) } as CSSProperties}
        onPointerDown={navStart}
        onPointerMove={navMove}
        onPointerUp={navEnd}
        onPointerCancel={navCancel}>
        <span className={'sona-nav-highlight' + (selectedIndex < 0 ? ' is-hidden' : '')} aria-hidden="true" />
        {tabs.map(({ key, label, icon: Icon, url }, i) => (
          <button key={key} type="button"
            className={'sona-tab ' + (selectedIndex === i ? 'sona-tab-active' : '')}
            aria-label={label}
            aria-current={selectedIndex === i && !isSearch ? 'page' : undefined}
            onClick={() => tabClick(url)}>
            <Icon size={22} strokeWidth={selectedIndex === i ? 2.5 : 1.8} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div
        className={'sona-search-morph' + (isSearch ? ' is-expanded' : '') + (focused ? ' is-focused' : '') + (isSearch ? ' is-search-visible' : '')}
        role={isSearch ? 'search' : undefined}
        aria-label={isSearch ? 'Search your music library' : undefined}>
        <button type="button" className="sona-search-exit" tabIndex={isSearch ? 0 : -1}
          aria-label="Return Home"
          onClick={() => { leaveSearch(); navigate(ROUTES.LIBRARY.HOME) }}>
          <House size={23} strokeWidth={2.1} />
        </button>
        <button type="button" className="sona-search-orb"
          aria-label={isSearch ? 'Focus search' : 'Search'}
          onClick={() => {
            if (!isSearch) {
              navigate('/mobile-search')
              return
            }
            setEngaged(true)
            inputRef.current?.focus({ preventScroll: true })
          }}>
          <Search size={24} strokeWidth={isSearch ? 2.3 : 1.9} />
        </button>
        <form className="sona-search-morph-field" aria-hidden={!isSearch} onSubmit={submitSearch}>
          <input
            ref={inputRef}
            type="search"
            aria-label="Search artists, albums, songs"
            tabIndex={isSearch ? 0 : -1}
            enterKeyHint="search"
            spellCheck={false}
            autoComplete="off"
            placeholder={focused ? 'Artists, albums, songs…' : 'Search Your Library'}
            value={term}
            onPointerDown={() => {
              // On iOS, focusing a fixed bottom input can scroll the document
              // to keep it above the incoming keyboard. Focus during the
              // trusted pointer event with preventScroll so the page stays put.
              if (document.activeElement !== inputRef.current) {
                inputRef.current?.focus({ preventScroll: true })
              }
            }}
            onFocus={() => {
              setEngaged(true)
              setFocused(true)
            }}
            onBlur={() => setFocused(false)}
            onChange={(event) => setTerm(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Escape') leaveSearch() }}
          />
          {term.length > 0
            ? <button type="button" className="sona-search-inline-action" tabIndex={isSearch ? 0 : -1}
                aria-label="Clear search"
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => setTerm('')}>
                <X size={17} />
              </button>
            : <button type="button" className="sona-search-inline-action" tabIndex={isSearch ? 0 : -1}
                aria-label="Voice search" onClick={startVoiceSearch}><Mic size={19} /></button>}
        </form>
        {voiceError && <span role="status" className="sona-search-voice-error">{voiceError}</span>}
      </div>
    </>
  )
}
