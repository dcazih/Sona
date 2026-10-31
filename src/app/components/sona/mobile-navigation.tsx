import { Compass, House, Library, ListPlus, Mic, Search, X } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties, type TouchEvent } from 'react'
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
type Swipe = { startX: number; startY: number; moved: boolean; index: number }

export function SonaMobileNavigation() {
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  const isSearch = pathname === '/mobile-search'
  const inputRef = useRef<HTMLInputElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const swipeRef = useRef<Swipe | null>(null)
  const blockClickUntil = useRef(0)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [keyboardVisible, setKeyboardVisible] = useState(false)
  const [searchVisible, setSearchVisible] = useState(false)
  const [voiceError, setVoiceError] = useState('')
  const recognition = useRef<Recognition | null>(null)
  const term = useSonaSearch((state) => state.term)
  const focused = useSonaSearch((state) => state.focused)
  const setTerm = useSonaSearch((state) => state.setTerm)
  const setFocused = useSonaSearch((state) => state.setFocused)
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
    const tabColor = isSearch ? '#080809' : '#171719'
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
  function navStart(event: TouchEvent<HTMLElement>) {
    if (event.touches.length !== 1 || isSearch) return
    const touch = event.touches[0]
    swipeRef.current = { startX: touch.clientX, startY: touch.clientY, moved: false, index: getIndexFromX(touch.clientX) }
  }
  function navMove(event: TouchEvent<HTMLElement>) {
    const swipe = swipeRef.current
    if (!swipe) return
    const t = event.touches[0]
    const dx = t.clientX - swipe.startX
    const dy = t.clientY - swipe.startY
    if (!swipe.moved && Math.abs(dy) > Math.abs(dx) * 1.3) {
      swipeRef.current = null
      setDragIndex(null)
      return
    }
    if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
      swipe.moved = true
      swipe.index = getIndexFromX(t.clientX)
      setDragIndex(swipe.index)
      if (event.cancelable) event.preventDefault()
    }
  }
  function navEnd() {
    const swipe = swipeRef.current
    swipeRef.current = null
    setDragIndex(null)
    if (swipe?.moved) {
      blockClickUntil.current = Date.now() + 350
      goTo(tabs[swipe.index].url)
    }
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
      setSearchVisible(false)
    }
  }, [isSearch, setFocused])

  useEffect(() => {
    if (!focused) {
      setSearchVisible(false)
      return
    }
    // Keep the control usable until iOS reports an actual keyboard viewport.
    // Once mounted, run the requested delayed fade. No guessed timeout is used
    // when the keyboard never appeared.
    if (!keyboardVisible) {
      setSearchVisible(true)
      return
    }
    setSearchVisible(false)
    const timer = window.setTimeout(() => setSearchVisible(true), 1500)
    return () => window.clearTimeout(timer)
  }, [focused, keyboardVisible])

  useEffect(() => {
    const vp = window.visualViewport
    const root = document.documentElement
    if (!isSearch) {
      root.style.removeProperty('--sona-visual-bottom')
      root.style.removeProperty('--sona-visual-height')
      root.style.removeProperty('--sona-keyboard-offset')
      return
    }
    let frame = 0
    let keyboardSettleTimer = 0
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
        const bottom = top + height
        if (height > baseline) baseline = height
        const keyboardHeight = Math.max(0, baseline - bottom)
        root.style.setProperty('--sona-visual-bottom', Math.round(bottom) + 'px')
        root.style.setProperty('--sona-visual-height', Math.round(height) + 'px')
        root.style.setProperty('--sona-keyboard-offset', Math.round(keyboardHeight) + 'px')
        window.clearTimeout(keyboardSettleTimer)
        if (keyboardHeight > 100) {
          // Wait for VisualViewport to stop changing so the 1.5 second reveal
          // begins after the keyboard has finished mounting.
          keyboardSettleTimer = window.setTimeout(
            () => setKeyboardVisible(true),
            160,
          )
        } else {
          setKeyboardVisible(false)
        }
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
      root.style.removeProperty('--sona-keyboard-offset')
      root.style.removeProperty('--sona-layout-height')
    }
  }, [isSearch])

  useEffect(() => {
    if (!isSearch) return
    const viewport = getMainScrollElement()
    if (!viewport) return
    let start: { x: number; y: number } | null = null
    const onStart = (event: globalThis.TouchEvent) => {
      if (event.touches.length === 1) {
        start = { x: event.touches[0].clientX, y: event.touches[0].clientY }
      }
    }
    const onMove = (event: globalThis.TouchEvent) => {
      if (!start || document.activeElement !== inputRef.current) return
      const dx = event.touches[0].clientX - start.x
      const dy = event.touches[0].clientY - start.y
      if (Math.abs(dy) > 15 && Math.abs(dy) > Math.abs(dx) * 1.2) {
        inputRef.current?.blur()
        setFocused(false)
        start = null
      }
    }
    viewport.addEventListener('touchstart', onStart, { passive: true })
    viewport.addEventListener('touchmove', onMove, { passive: true })
    return () => {
      viewport.removeEventListener('touchstart', onStart)
      viewport.removeEventListener('touchmove', onMove)
    }
  }, [isSearch, setFocused])

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

  return (
    <>
      <nav
        ref={navRef}
        className={'sona-bottom-nav sona-bottom-nav-split' + (isSearch ? ' is-searching' : '') + (dragIndex !== null ? ' is-dragging' : '')}
        aria-label="Music navigation"
        style={{ '--sona-nav-index': selectedIndex < 0 ? 0 : selectedIndex } as CSSProperties}
        onTouchStart={navStart}
        onTouchMove={navMove}
        onTouchEnd={navEnd}
        onTouchCancel={() => { swipeRef.current = null; setDragIndex(null) }}>
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
        className={'sona-search-morph' + (isSearch ? ' is-expanded' : '') + (focused || keyboardVisible ? ' is-focused' : '') + (searchVisible ? ' is-search-visible' : '')}
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
            inputRef.current?.focus({ preventScroll: true })
          }}>
          <Search size={24} strokeWidth={isSearch ? 2.3 : 1.9} />
        </button>
        <div className="sona-search-morph-field" aria-hidden={!isSearch}>
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
            onFocus={() => {
              setFocused(true)
              requestAnimationFrame(() => {
                getMainScrollElement()?.scrollTo({ top: 0, behavior: 'instant' })
              })
            }}
            onBlur={() => setFocused(false)}
            onChange={(event) => setTerm(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Escape') leaveSearch() }}
          />
          {term.length > 0
            ? <button type="button" className="sona-search-inline-action" tabIndex={isSearch ? 0 : -1}
                aria-label="Clear search" onClick={() => { setTerm(''); inputRef.current?.focus() }}>
                <X size={17} />
              </button>
            : <button type="button" className="sona-search-inline-action" tabIndex={isSearch ? 0 : -1}
                aria-label="Voice search" onClick={startVoiceSearch}><Mic size={19} /></button>}
        </div>
        {voiceError && <span role="status" className="sona-search-voice-error">{voiceError}</span>}
      </div>
    </>
  )
}
