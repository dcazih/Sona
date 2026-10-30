import { Compass, House, Library, Radio, Search, X, Mic } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ROUTES } from '@/routes/routesList'
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
  const recognition = useRef<Recognition | null>(null)

  useEffect(() => {
    if (!isSearch && focused) setFocused(false)
    if (!isSearch) recognition.current?.stop()
  }, [isSearch, focused, setFocused])

  useEffect(() => {
    const vp = window.visualViewport
    if (!isSearch || !focused || !vp) {
      document.documentElement.style.setProperty('--sona-keyboard-offset', '0px')
      return
    }
    const update = () => {
      const offset = Math.max(0, window.innerHeight - vp.height - vp.offsetTop)
      document.documentElement.style.setProperty('--sona-keyboard-offset', offset > 110 ? Math.round(offset) + 'px' : '0px')
    }
    update()
    vp.addEventListener('resize', update)
    vp.addEventListener('scroll', update)
    return () => {
      vp.removeEventListener('resize', update)
      vp.removeEventListener('scroll', update)
      document.documentElement.style.setProperty('--sona-keyboard-offset', '0px')
    }
  }, [isSearch, focused])

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
          className={'sona-floating-search ' + (isSearch ? 'is-selected' : '')}
          aria-label="Search"
          onClick={() => {
            if (!isSearch) { navigate('/mobile-search'); return }
            if (!focused) { setFocused(true); inputRef.current?.focus() }
          }}>
          <Search size={25} />
        </button>
      </nav>
      {isSearch && (
        <div className={'sona-search-dock ' + (focused ? 'is-active' : '')}
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
