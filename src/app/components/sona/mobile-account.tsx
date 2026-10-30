import { ChevronLeft, ChevronRight, CircleUserRound, Globe2, Headphones, LibraryBig,
  LockKeyhole, LogOut, Paintbrush, Settings2, SlidersHorizontal, UserRound, X } from 'lucide-react'
import { useEffect, useRef, useState, type TouchEvent } from 'react'
import { createPortal } from 'react-dom'
import { SonaMark } from '@/app/components/header/sona-mark'
import { Pages } from '@/app/components/settings/pages'
import type { SettingsOptions } from '@/app/components/settings/options'
import { useAppData, useAppSettings, useAppStore } from '@/store/app.store'

const groups: { label: string; items: { key: SettingsOptions; title: string; icon: typeof Settings2 }[] }[] = [
  { label: 'Your music', items: [
    { key: 'sona', title: 'Music Settings', icon: SlidersHorizontal },
    { key: 'audio', title: 'Audio & Playback', icon: Headphones },
    { key: 'content', title: 'Library', icon: LibraryBig },
  ] },
  { label: 'Preferences', items: [
    { key: 'appearance', title: 'Appearance', icon: Paintbrush },
    { key: 'language', title: 'Language', icon: Globe2 },
    { key: 'accounts', title: 'Connected Accounts', icon: UserRound },
    { key: 'privacy', title: 'Privacy & Access', icon: LockKeyhole },
  ] },
]

/**
 * Portaled bottom sheet, independent of WebKit's native <dialog> support,
 * and outside the scrolling app's stacking contexts.
 */
export function SonaMobileAccount() {
  const { username, url, lockUser } = useAppData()
  const { setCurrentPage } = useAppSettings()
  const setLogoutDialogState = useAppStore((state) => state.actions.setLogoutDialogState)
  const [open, setOpen] = useState(false)
  const [section, setSection] = useState<SettingsOptions | null>(null)
  const pull = useRef(0)
  const start = useRef<number | null>(null)
  const sheetRef = useRef<HTMLElement>(null)
  const scroll = useRef<HTMLDivElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)

  function dismiss() {
    setOpen(false)
    pull.current = 0
    start.current = null
    if (sheetRef.current) sheetRef.current.style.transform = 'translate3d(0,106%,0)'
  }
  function navigateTo(page: SettingsOptions) {
    setCurrentPage(page)
    setSection(page)
    scroll.current?.scrollTo({ top: 0, behavior: 'auto' })
  }

  useEffect(() => {
    if (!open) {
      setSection(null)
      return
    }
    const oldOverflow = document.body.style.overflow
    const oldOverscroll = document.body.style.overscrollBehavior
    document.body.style.overflow = 'hidden'
    document.body.style.overscrollBehavior = 'none'
    closeButton.current?.focus({ preventScroll: true })
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss()
      if (event.key !== 'Tab') return
      const node = document.querySelector<HTMLElement>('.sona-account-portal-sheet')
      const controls = Array.from(node?.querySelectorAll<HTMLElement>(
        'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),[tabindex="0"]'
      ) || [])
      if (!controls.length) return
      const first = controls[0], last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = oldOverflow
      document.body.style.overscrollBehavior = oldOverscroll
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  // Only the dedicated grab handle drags the sheet. Native content scrolling
  // never touches React state, preventing the settings tree from re-rendering
  // on every touchmove (the previous source of severe iOS scroll jitter).
  function gestureStart(event: TouchEvent<HTMLButtonElement>) {
    if (event.touches.length !== 1) return
    start.current = event.touches[0].clientY
    pull.current = 0
    if (sheetRef.current) sheetRef.current.style.transition = 'none'
  }
  function gestureMove(event: TouchEvent<HTMLButtonElement>) {
    if (start.current === null || !sheetRef.current) return
    const diff = event.touches[0].clientY - start.current
    if (diff <= 0) return
    pull.current = Math.min(250, diff * .76)
    sheetRef.current.style.transform = 'translate3d(0,' + pull.current + 'px,0)'
    if (event.cancelable) event.preventDefault()
  }
  function gestureEnd() {
    start.current = null
    const moved = pull.current
    pull.current = 0
    if (sheetRef.current) {
      sheetRef.current.style.transition = ''
      sheetRef.current.style.transform = moved > 85 ? 'translate3d(0,106%,0)' : 'translate3d(0,0,0)'
    }
    if (moved > 85) dismiss()
  }
  const title = groups.flatMap(group => group.items).find(item => item.key === section)?.title

  return (
    <>
      <div className="sona-mobile-account">
        <button type="button" className="sona-account-trigger"
          aria-label="Open Sona Account" aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}>
          {username ? username.charAt(0).toUpperCase() : <CircleUserRound size={20} />}
        </button>
      </div>
      {createPortal(
        <div className={'sona-account-portal' + (open ? ' is-open' : '')}
          aria-hidden={!open} data-testid="sona-account-sheet">
          <div className="sona-account-portal-backdrop" onClick={dismiss} />
          <section ref={sheetRef} className="sona-account-portal-sheet" role="dialog"
            aria-modal={open ? 'true' : undefined}
            aria-label="Sona Account" style={{
              transform: open ? 'translate3d(0,0,0)' : 'translate3d(0,106%,0)',
            }}>
            <header className="sona-account-sheet-heading">
              <button type="button" className="sona-account-grab-target"
                aria-label="Drag down to close account"
                onTouchStart={gestureStart} onTouchMove={gestureMove} onTouchEnd={gestureEnd}
                onTouchCancel={gestureEnd}>
                <span className="sona-account-grabber" aria-hidden="true" />
              </button>
              <div className="sona-account-heading-row">
                {section
                  ? <button className="sona-account-back" type="button"
                      onClick={() => { setSection(null); scroll.current?.scrollTo({ top: 0, behavior: 'auto' }) }}>
                      <ChevronLeft size={22} /> Account
                    </button>
                  : <div className="sona-account-heading-title">
                      <SonaMark size={32} /><strong>Sona Account</strong>
                    </div>}
                <button ref={closeButton} type="button" className="sona-account-close"
                  aria-label="Close Sona Account" onClick={dismiss}><X size={24} />
                </button>
              </div>
              {section && <h2 className="sona-account-subheading">{title}</h2>}
            </header>
            <div className="sona-account-scroll" ref={scroll}>
              {section
                ? <div className="sona-account-settings-content"><Pages /></div>
                : <div className="sona-account-overview">
                    <button className="sona-account-profile sona-account-group" type="button"
                      onClick={() => navigateTo('accounts')}>
                      <span className="sona-account-avatar" aria-hidden="true">
                        {username?.charAt(0).toUpperCase() || <CircleUserRound size={28} />}
                      </span>
                      <span className="sona-account-profile-info">
                        <strong>{username || 'Sona listener'}</strong>
                        <span>Account information & connected services</span>
                        <small>{url || 'Music server'}</small>
                      </span>
                      <ChevronRight size={20} className="sona-account-chevron" />
                    </button>
                    {groups.map(group => (
                      <div key={group.label} className="sona-account-section">
                        <p className="sona-account-section-label">{group.label}</p>
                        <div className="sona-account-group">
                          {group.items.map(item => (
                            <button type="button" key={item.key} className="sona-account-item"
                              onClick={() => navigateTo(item.key)}>
                              <span className="sona-account-item-icon">
                                <item.icon size={21} strokeWidth={1.9}/>
                              </span>
                              <span className="sona-account-item-copy"><strong>{item.title}</strong></span>
                              <ChevronRight size={20} className="sona-account-chevron" />
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    {!lockUser && <div className="sona-account-section">
                      <div className="sona-account-group">
                        <button type="button" className="sona-account-item sona-account-logout"
                          onClick={() => { dismiss(); setLogoutDialogState(true) }}>
                          <span className="sona-account-item-icon"><LogOut size={20}/></span>
                          <span className="sona-account-item-copy"><strong>Sign Out</strong></span>
                        </button>
                      </div>
                    </div>}
                    <p className="sona-account-footer">Sona · Your music, your way.</p>
                  </div>}
            </div>
          </section>
        </div>, document.body)}
    </>
  )
}
