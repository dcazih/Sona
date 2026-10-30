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

export function SonaMobileAccount() {
  const { username, url, lockUser } = useAppData()
  const { setCurrentPage } = useAppSettings()
  const setLogoutDialogState = useAppStore((state) => state.actions.setLogoutDialogState)
  const dialog = useRef<HTMLDialogElement>(null)
  const closeTimer = useRef<number | null>(null)
  const [open, setOpen] = useState(false)
  const [section, setSection] = useState<SettingsOptions | null>(null)
  const [pull, setPull] = useState(0)
  const start = useRef<number | null>(null)
  const scroll = useRef<HTMLDivElement>(null)

  function show() {
    if (!dialog.current) return
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current)
    if (!dialog.current.open) dialog.current.showModal()
    // The native dialog is in the browser top layer, above header, player,
    // nav bars and every stacking context.
    window.requestAnimationFrame(() => setOpen(true))
  }

  function finishClose() {
    dialog.current?.close()
    setOpen(false)
    setSection(null)
    setPull(0)
  }

  function dismiss() {
    setOpen(false)
    setPull(0)
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(finishClose, 330)
  }

  function navigateTo(page: SettingsOptions) {
    setCurrentPage(page)
    setSection(page)
    scroll.current?.scrollTo({ top: 0, behavior: 'instant' })
  }

  useEffect(() => () => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current)
  }, [])

  function gestureStart(event: TouchEvent<HTMLElement>) {
    if (event.touches.length !== 1) return
    start.current = event.touches[0].clientY
  }
  function gestureMove(event: TouchEvent<HTMLElement>) {
    if (start.current === null) return
    const delta = event.touches[0].clientY - start.current
    setPull(Math.max(0, Math.min(120, delta * .55)))
    if (delta > 12 && event.cancelable) event.preventDefault()
  }
  function gestureEnd() {
    if (pull > 75) dismiss()
    else setPull(0)
    start.current = null
  }

  const title = groups.flatMap((group) => group.items).find((item) => item.key === section)?.title

  return (
    <>
      <div className="sona-mobile-account">
        <button type="button" className="sona-account-trigger"
          aria-label="Open Sona Account" aria-haspopup="dialog"
          onClick={show}>
          {username ? username.charAt(0).toUpperCase() : <CircleUserRound size={20} />}
        </button>
      </div>
      {createPortal(
        <dialog ref={dialog}
          className={'sona-account-native-dialog' + (open ? ' is-open' : '')}
          aria-label="Sona Account"
          onCancel={(event) => { event.preventDefault(); dismiss() }}
          onClose={() => { setOpen(false); setSection(null); setPull(0) }}
          onClick={(event) => { if (event.target === dialog.current) dismiss() }}>
          <div className="sona-account-sheet-body" style={{ transform: 'translateY(' + pull + 'px)' }}>
            <header className="sona-account-sheet-heading"
              onTouchStart={gestureStart} onTouchMove={gestureMove} onTouchEnd={gestureEnd}
              onTouchCancel={() => { start.current = null; setPull(0) }}>
              <span className="sona-account-grabber" aria-hidden="true" />
              <div className="sona-account-heading-row">
                {section
                  ? <button className="sona-account-back" type="button"
                      onClick={() => { setSection(null); scroll.current?.scrollTo({ top: 0 }) }}>
                      <ChevronLeft size={22} /> Account
                    </button>
                  : <div className="sona-account-heading-title"><SonaMark size={32} /><strong>Sona Account</strong></div>}
                <button type="button" className="sona-account-close"
                  aria-label="Close Sona Account" onClick={dismiss}><X size={24} /></button>
              </div>
              {section && <h2 className="sona-account-subheading">{title}</h2>}
            </header>

            <div className="sona-account-scroll" ref={scroll}>
              {section ? (
                <div className="sona-account-settings-content"><Pages /></div>
              ) : (
                <div className="sona-account-overview">
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
                  {groups.map((group) => (
                    <div key={group.label} className="sona-account-section">
                      <p className="sona-account-section-label">{group.label}</p>
                      <div className="sona-account-group">
                        {group.items.map((item) => (
                          <button type="button" key={item.key} className="sona-account-item"
                            onClick={() => navigateTo(item.key)}>
                            <span className="sona-account-item-icon"><item.icon size={21} strokeWidth={1.9}/></span>
                            <span className="sona-account-item-copy"><strong>{item.title}</strong></span>
                            <ChevronRight size={20} className="sona-account-chevron"/>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {!lockUser && (
                    <div className="sona-account-section">
                      <div className="sona-account-group">
                        <button type="button" className="sona-account-item sona-account-logout"
                          onClick={() => { dismiss(); setLogoutDialogState(true) }}>
                          <span className="sona-account-item-icon"><LogOut size={20} /></span>
                          <span className="sona-account-item-copy"><strong>Sign Out</strong></span>
                        </button>
                      </div>
                    </div>
                  )}
                  <p className="sona-account-footer">Sona · Your music, your way.</p>
                </div>
              )}
            </div>
          </div>
        </dialog>,
        document.body,
      )}
    </>
  )
}
