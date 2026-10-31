import { Compass, House, Library, ListPlus, Mic, Search, X } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type TouchEvent } from 'react'
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
  const scrollResetTimers = useRef<number[]>([])
  const scrollViewportCleanup = useRef<(() => void) | null>(null)
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
    const tabColor = pathname === '/mobile-request' ? '#171719' : '#080809'
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
      setSearchVisible(true)
      return
    }
    // Keep the control usable until iOS reports an actual keyboard viewport.
    // Once mounted, run the requested delayed fade. No guessed timeout is used
    // when the keyboard never appeared.
    if (!keyboardVisible) { setSearchVisible(false); return }
    setSearchVisible(false)
    const timer = window.setTimeout(() => setSearchVisible(true), 500)
    return () => window.clearTimeout(timer)
  }, [focused, keyboardVisible])

  useEffect(() => () => {
    scrollResetTimers.current.forEach(window.clearTimeout)
    scrollViewportCleanup.current?.()
  }, [])

  function forceSearchTop() {
    const viewport = getMainScrollElement()
    if (viewport) {
      viewport.scrollTop = 0
      viewport.scrollTo({ top: 0, behavior: 'auto' })
    }
    document.scrollingElement?.scrollTo({ top: 0, behavior: 'auto' })
    window.scrollTo(0, 0)
    // iOS can pan the visual viewport to keep the focused input visible even
    // though the app itself is fixed. Undo that pan so the page stays at its
    // normal top while the keyboard mounts.
    window.visualViewport?.scrollTo({ left: 0, top: 0 })
  }

  useEffect(() => {
    if (!isSearch || !focused) return
    let frame = 0
    const keepSearchAtTop = () => {
      if (frame) cancelAnimationFrame(frame)
      frame = requestAnimationFrame(forceSearchTop)
    }
    keepSearchAtTop()
    window.visualViewport?.addEventListener('resize', keepSearchAtTop)
    window.visualViewport?.addEventListener('scroll', keepSearchAtTop)
    window.addEventListener('resize', keepSearchAtTop)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.visualViewport?.removeEventListener('resize', keepSearchAtTop)
      window.visualViewport?.removeEventListener('scroll', keepSearchAtTop)
      window.removeEventListener('resize', keepSearchAtTop)
    }
  }, [isSearch, focused])

  function resetSearchAfterKeyboard() {
    scrollResetTimers.current.forEach(window.clearTimeout)
    scrollResetTimers.current = []
    scrollViewportCleanup.current?.()
    requestAnimationFrame(forceSearchTop)
    const viewport = window.visualViewport
    const onViewportChange = () => forceSearchTop()
    viewport?.addEventListener('resize', onViewportChange)
    viewport?.addEventListener('scroll', onViewportChange)
    scrollViewportCleanup.current = () => {
      viewport?.removeEventListener('resize', onViewportChange)
      viewport?.removeEventListener('scroll', onViewportChange)
      scrollViewportCleanup.current = null
    }
    for (const delay of [120, 280, 520, 850]) {
      scrollResetTimers.current.push(window.setTimeout(forceSearchTop, delay))
    }
    scrollResetTimers.current.push(window.setTimeout(() => {
      scrollViewportCleanup.current?.()
      forceSearchTop()
    }, 950))
  }

  useEffect(() => {
    const vp = window.visualViewport
    const root = document.documentElement
    if (!isSearch) {
      root.style.removeProperty('--sona-visual-bottom')
      root.style.removeProperty('--sona-visual-height')
      root.style.removeProperty('--sona-visual-top')
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
        if (height > baseline) baseline = height
        const keyboardHeight = Math.max(0, baseline - height)
        root.style.setProperty('--sona-visual-bottom', Math.round(top + height) + 'px')
        root.style.setProperty('--sona-visual-height', Math.round(height) + 'px')
        root.style.setProperty('--sona-visual-top', Math.round(top) + 'px')
        root.style.setProperty('--sona-keyboard-offset', Math.round(keyboardHeight) + 'px')
        window.clearTimeout(keyboardSettleTimer)
        if (keyboardHeight > 100) {
          // Wait for VisualViewport to stop changing before the short reveal
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
      root.style.removeProperty('--sona-visual-top')
      root.style.removeProperty('--sona-keyboard-offset')
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
    resetSearchAfterKeyboard()
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
        className={'sona-search-morph' + (isSearch ? ' is-expanded' : '') + (focused ? ' is-focused' : '') + (searchVisible ? ' is-search-visible' : '')}
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
            onFocus={() => {
              setEngaged(true)
              setFocused(true)
              requestAnimationFrame(forceSearchTop)
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
        </form>
        {voiceError && <span role="status" className="sona-search-voice-error">{voiceError}</span>}
      </div>
    </>
  )
}
