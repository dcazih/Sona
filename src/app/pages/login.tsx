import { useEffect, useRef } from 'react'
import { SonaMark } from '@/app/components/header/sona-mark'
import { LoginForm } from '@/app/components/login/form'

export default function Login() {
  const main = useRef<HTMLElement>(null)
  useEffect(() => {
    // Safari and password managers may restore a focused input when the
    // Login route opens. Do not open the keyboard until the user explicitly
    // taps a field; never blur after a genuine user interaction.
    let interacted = false
    const onInteraction = () => { interacted = true }
    const clearStartupFocus = () => {
      if (interacted) return
      const active = document.activeElement
      if (active instanceof HTMLInputElement && main.current?.contains(active)) active.blur()
    }
    window.addEventListener('pointerdown', onInteraction, { capture: true, once: true })
    window.addEventListener('keydown', onInteraction, { capture: true, once: true })
    const frame = window.requestAnimationFrame(clearStartupFocus)
    const timeout = window.setTimeout(clearStartupFocus, 120)
    clearStartupFocus()
    const viewport = window.visualViewport
    const scrollInputIntoView = () => {
      const field = document.activeElement
      if (!(field instanceof HTMLInputElement) || !main.current?.contains(field)) return
      field.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
    viewport?.addEventListener('resize', scrollInputIntoView)
    return () => {
      viewport?.removeEventListener('resize', scrollInputIntoView)
      window.removeEventListener('pointerdown', onInteraction, true)
      window.removeEventListener('keydown', onInteraction, true)
      window.cancelAnimationFrame(frame)
      window.clearTimeout(timeout)
    }
  }, [])
  return (
    <div className="sona-login-screen">
      <main ref={main} className="sona-login-main">
        <div className="sona-login-intro">
          <SonaMark size={68} className="sona-login-main-mark" />
          <h1 className="sona-login-brand-title">Sona</h1>
          <p className="sona-login-brand-tagline">Apple Music. Minus Apple.</p>
        </div>
        <LoginForm />
      </main>
    </div>
  )
}
