import { ChevronLeft, ChevronRight, CircleUserRound, Globe2, Headphones,
  LibraryBig, LockKeyhole, LogOut, Paintbrush, Settings2, SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useRef, useState, type TouchEvent } from 'react'
import { createPortal } from 'react-dom'
import { Pages } from '@/app/components/settings/pages'
import type { SettingsOptions } from '@/app/components/settings/options'
import { SonaMark } from '@/app/components/header/sona-mark'
import { useAppData, useAppSettings, useAppStore } from '@/store/app.store'

const groups: { label: string; items: { key: SettingsOptions; title: string; description: string; icon: typeof Settings2 }[] }[] = [
  { label: 'Your music', items: [
    { key: 'sona', title: 'Music Settings', description: 'Playback, downloads and offline music', icon: SlidersHorizontal },
    { key: 'audio', title: 'Player & Audio', description: 'Sound, lyrics and ReplayGain', icon: Headphones },
    { key: 'content', title: 'Library & Content', description: 'Home, artwork and browsing', icon: LibraryBig },
  ] },
  { label: 'App settings', items: [
    { key: 'appearance', title: 'Appearance', description: 'Theme and player colors', icon: Paintbrush },
    { key: 'language', title: 'Language', description: 'Display language', icon: Globe2 },
    { key: 'privacy', title: 'Privacy & Access', description: 'Connected services and privacy', icon: LockKeyhole },
  ] },
]

export function SonaMobileAccount() {
  const { username, url, lockUser } = useAppData()
  const { currentPage, setCurrentPage } = useAppSettings()
  const setLogoutDialogState = useAppStore((s) => s.actions.setLogoutDialogState)
  const [open, setOpen] = useState(false)
  const [section, setSection] = useState<SettingsOptions | null>(null)
  const scroll = useRef<HTMLDivElement>(null)
  const gesture = useRef<{ start: number; enabled: boolean } | null>(null)
  const [pull, setPull] = useState(0)

  function close() {
    setOpen(false)
    setSection(null)
    setPull(0)
  }
  function goTo(page: SettingsOptions) {
    setCurrentPage(page)
    setSection(page)
    scroll.current?.scrollTo({ top: 0, behavior: 'auto' })
  }
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') close() }
    window.addEventListener('keydown', escape)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', escape)
    }
  }, [open])

  function touchStart(event: TouchEvent<HTMLElement>) {
    if (event.touches.length !== 1) return
    gesture.current = {
      start: event.touches[0].clientY,
      enabled: scroll.current?.scrollTop === 0 && !section,
    }
  }
  function touchMove(event: TouchEvent<HTMLElement>) {
    const start = gesture.current
    if (!start?.enabled) return
    const delta = event.touches[0].clientY - start.start
    if (delta > 0) {
      setPull(Math.min(110, delta * 0.54))
      if (event.cancelable) event.preventDefault()
    }
  }
  function touchEnd() {
    if (pull > 82) close()
    else setPull(0)
    gesture.current = null
  }

  return (
    <>
      <div className="sona-mobile-account">
        <button type="button" className="sona-account-trigger" aria-label="Open Sona Account"
          onClick={() => setOpen(true)}>
          {username ? username.slice(0, 1).toUpperCase() : <CircleUserRound size={19} />}
        </button>
      </div>
      {createPortal(
        <div className={'sona-account-modal' + (open ? ' is-open' : '')} aria-hidden={!open}>
          <div className="sona-account-scrim" onClick={close} aria-hidden="true" />
          <section className="sona-account-sheet" role="dialog" aria-modal={open ? 'true' : undefined}
            aria-label="Sona Account" style={{ transform: 'translateY(' + (open ? pull : 110) + (open ? 'px)' : '%)') }}>
            <div className="sona-account-sheet-heading"
              onTouchStart={touchStart} onTouchMove={touchMove} onTouchEnd={touchEnd}
              onTouchCancel={() => setPull(0)}>
              <span className="sona-account-grabber" aria-hidden="true" />
              <div className="sona-account-heading-row">
                {section ? (
                  <button type="button" className="sona-account-back" aria-label="Back to account"
                    onClick={() => { setSection(null); scroll.current?.scrollTo({ top: 0 }) }}>
                    <ChevronLeft size={25} /> Back
                  </button>
                ) : (
                  <div className="sona-account-heading-title">
                    <SonaMark size={30} /><strong>Sona Account</strong>
                  </div>
                )}
                <button type="button" className="sona-account-close" aria-label="Close account"
                  onClick={close}><X size={23} strokeWidth={2.5} /></button>
              </div>
              {section && <h2 className="sona-account-subheading">
                {groups.flatMap(g => g.items).find(item => item.key === section)?.title || 'Settings'}
              </h2>}
            </div>
            <div className="sona-account-scroll" ref={scroll}>
              {section ? (
                <div className="sona-account-settings-content" key={currentPage}>
                  <Pages />
                </div>
              ) : (
                <div className="sona-account-overview">
                  <div className="sona-account-profile sona-account-group">
                    <span className="sona-account-avatar" aria-hidden="true">
                      {username?.slice(0, 1).toUpperCase() || <CircleUserRound size={28} />}
                    </span>
                    <div className="sona-account-profile-info">
                      <strong>{username || 'Sona listener'}</strong>
                      <span>Connected music account</span>
                      <small>{url || 'Navidrome'}</small>
                    </div>
                    <ChevronRight size={20} color="#8f8f98" />
                  </div>
                  {groups.map(group => (
                    <div key={group.label} className="sona-account-section">
                      <p className="sona-account-section-label">{group.label}</p>
                      <div className="sona-account-group">
                        {group.items.map(({ key, title, description, icon: Icon }) => (
                          <button type="button" key={key} className="sona-account-item" onClick={() => goTo(key)}>
                            <span className="sona-account-item-icon"><Icon size={20} strokeWidth={1.8} /></span>
                            <span className="sona-account-item-copy">
                              <strong>{title}</strong>
                              <small>{description}</small>
                            </span>
                            <ChevronRight size={20} className="sona-account-chevron" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {!lockUser && <div className="sona-account-section">
                    <div className="sona-account-group">
                      <button type="button" className="sona-account-item sona-account-logout"
                        onClick={() => { close(); setLogoutDialogState(true) }}>
                        <span className="sona-account-item-icon"><LogOut size={20} /></span>
                        <span className="sona-account-item-copy"><strong>Sign out</strong></span>
                      </button>
                    </div>
                  </div>}
                  <p className="sona-account-footer">Sona · Your music, your way.</p>
                </div>
              )}
            </div>
          </section>
        </div>,
        document.body,
      )}
    </>
  )
}
