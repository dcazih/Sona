import { Compass, House, Library, Radio, Search, X, Mic } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ROUTES } from '@/routes/routesList'
import { getMainScrollElement } from '@/utils/scrollPageToTop'
import { useSonaSearch } from './search-state'

const tabs = [
  { key: 'home', label: 'Home', icon: House, url: ROUTES.LIBRARY.HOME },
  { key: 'new', label: 'New', icon: Compass, url: ROUTES.ALBUMS.RECENTLY_ADDED },
  { key: 'radio', label: 'Radio', icon: Radio, url: ROUTES.LIBRARY.RADIOS },
  { key: 'library', label: 'Library', icon: Library, url: '/mobile-library' },
]

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

export function SonaMobileNavigation() {
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  const isSearch = pathname === '/mobile-search'
  const inputRef = useRef<HTMLInputElement>(null)
  const term = useSonaSearch((state) => state.term)
  const focused = useSonaSearch((state) => state.focused)
  const setTerm = useSonaSearch((state) => state.setTerm)
  const setFocused = useSonaSearch((state) => state.setFocused)
  const reset = useSonaSearch((state) => state.reset)
  const [voiceError, setVoiceError] = useState('')
  const [keyboardVisible, setKeyboardVisible] = useState(false)
  const recognition = useRef<Recognition | null>(null)

  useEffect(() => {
    if (!isSearch && focused) setFocused(false)
    if (!isSearch) {
      recognition.current?.stop()
      setKeyboardVisible(false)
    }
  }, [isSearch, focused, setFocused])

  useEffect(() => {
    const vp = window.visualViewport
    if (!isSearch || !vp) {
      document.documentElement.style.setProperty('--sona-keyboard-offset', '0px')
      return
    }
    let frame: number | null = null
    const update = () => {
      if (frame !== null) cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        // visualViewport changes continuously as iOS animates its keyboard.
        const offset = Math.max(0, window.innerHeight - vp.height - vp.offsetTop)
        const next = offset > 15 ? Math.round(offset) : 0
        // Keep the dock attached while iOS animates the keyboard closed,
        // even after the input's blur event.
        setKeyboardVisible(next > 0)
        document.documentElement.style.setProperty('--sona-keyboard-offset', next + 'px')
        document.documentElement.style.setProperty('--sona-keyboard-visible', next > 0 ? '1' : '0')
        frame = null
      })
    }
    update()
    vp.addEventListener('resize', update)
    vp.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    return () => {
      if (frame !== null) cancelAnimationFrame(frame)
      vp.removeEventListener('resize', update)
      vp.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      document.documentElement.style.setProperty('--sona-keyboard-offset', '0px')
      document.documentElement.style.setProperty('--sona-keyboard-visible', '0')
    }
  }, [isSearch])

  useEffect(() => {
    if (!isSearch) return
    const viewport = getMainScrollElement()
    if (!viewport) return
    let touchOrigin: { x: number; y: number } | null = null

    function onTouchStart(event: TouchEvent) {
      if (event.touches.length !== 1) return
      touchOrigin = { x: event.touches[0].clientX, y: event.touches[0].clientY }
    }
    function onTouchMove(event: TouchEvent) {
      if (!touchOrigin || document.activeElement !== inputRef.current) return
      const dx = event.touches[0].clientX - touchOrigin.x
      const dy = event.touches[0].clientY - touchOrigin.y
      if (Math.abs(dy) > 13 && Math.abs(dy) > Math.abs(dx) * 1.15) {
        inputRef.current?.blur()
        setFocused(false)
        touchOrigin = null
      }
    }
    function onScroll() {
      if (viewport && viewport.scrollTop > 25 && document.activeElement === inputRef.current) {
        inputRef.current?.blur()
        setFocused(false)
      }
    }
    viewport.addEventListener('touchstart', onTouchStart, { passive: true })
    viewport.addEventListener('touchmove', onTouchMove, { passive: true })
    viewport.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      viewport.removeEventListener('touchstart', onTouchStart)
      viewport.removeEventListener('touchmove', onTouchMove)
      viewport.removeEventListener('scroll', onScroll)
    }
  }, [isSearch, setFocused])

  function voiceSearch() {
    const w = window as SpeechWindow
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setVoiceError('Voice search is not available in this browser.')
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
        setFocused(true)
        inputRef.current?.focus()
        setVoiceError('')
      }
      r.onerror = () => setVoiceError('Voice search needs microphone permission.')
      r.start()
    } catch {
      setVoiceError('Voice search could not start.')
    }
  }

  function stopSearch() {
    inputRef.current?.blur()
    setFocused(false)
    recognition.current?.stop()
    setVoiceError('')
    reset()
  }

  const active = (key: string) => {
    if (key === 'home') return pathname === '/'
    if (key === 'new') return pathname + search === ROUTES.ALBUMS.RECENTLY_ADDED
    if (key === 'radio') return pathname === ROUTES.LIBRARY.RADIOS
    if (key === 'library') return pathname === '/mobile-library' ||
      (pathname.startsWith('/library') && !active('new') && !active('radio'))
    return false
  }

  return (
    <>
      <nav className={'sona-bottom-nav ' + (isSearch ? 'sona-nav-search-mode' : '')}
        aria-label="Music navigation">
        {tabs.map(({ key, label, icon: Icon, url }) => (
          <button
            key={key}
            type="button"
            className={'sona-tab ' + (active(key) ? 'sona-tab-active' : '')}
            aria-label={label}
            aria-current={active(key) ? 'page' : undefined}
            onClick={() => { stopSearch(); navigate(url) }}
          >
            <Icon size={22} strokeWidth={active(key) ? 2.6 : 1.8} />
            <span>{label}</span>
          </button>
        ))}
        <button type="button"
          className={'sona-tab sona-tab-search ' + (isSearch ? 'sona-tab-active' : '')}
          aria-label="Search"
          onClick={() => {
            if (!isSearch) { navigate('/mobile-search'); return }
            if (!focused) { setFocused(true); inputRef.current?.focus() }
          }}>
          <Search size={22} strokeWidth={isSearch ? 2.6 : 1.8} />
          <span>Search</span>
        </button>
      </nav>
      {isSearch && (
        <div className={'sona-search-dock ' + (focused || keyboardVisible ? 'is-active' : '')}
          role="search" aria-label="Search your music">
          <button className="sona-search-library-toggle" type="button"
            aria-label="Return to library" onClick={() => { stopSearch(); navigate('/mobile-library') }}>
            <Library size={24} />
          </button>
          <div className="sona-search-dock-field">
            <Search size={20} className="sona-search-dock-icon" />
            <input ref={inputRef} type="search" enterKeyHint="search"
              autoComplete="off" spellCheck={false} aria-label="Search artists, songs, albums"
              placeholder={focused ? 'Artists, songs, albums...' : 'Search Your Library'}
              value={term}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onChange={(e) => setTerm(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') stopSearch() }}
            />
            {term.length > 0
              ? <button type="button" aria-label="Clear search"
                  onClick={() => { setTerm(''); inputRef.current?.focus() }}>
                  <X size={19} /></button>
              : <button type="button" aria-label="Voice search" onClick={voiceSearch}>
                  <Mic size={19} /></button>}
          </div>
          <button type="button" className="sona-search-cancel"
            aria-label="Cancel search" onClick={stopSearch}>
            {focused ? <X size={25} /> : <Search size={23} />}
          </button>
          {voiceError && <span className="sona-search-voice-error" role="status">{voiceError}</span>}
        </div>
      )}
    </>
  )
}
