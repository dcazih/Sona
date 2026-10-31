import { useEffect, useRef } from 'react'
import { SonaMark } from '@/app/components/header/sona-mark'
import { LoginForm } from '@/app/components/login/form'

export default function Login() {
  const main = useRef<HTMLElement>(null)
  useEffect(() => {
    const viewport = window.visualViewport
    const scrollInputIntoView = () => {
      const field = document.activeElement
      if (!(field instanceof HTMLInputElement) || !main.current?.contains(field)) return
      field.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
    viewport?.addEventListener('resize', scrollInputIntoView)
    return () => viewport?.removeEventListener('resize', scrollInputIntoView)
  }, [])
  return (
    <div className="sona-login-screen">
      <main ref={main} className="sona-login-main">
        <div className="sona-login-intro">
          <SonaMark size={90} className="sona-login-main-mark" />
          <h1 className="sona-login-brand-title">Sona</h1>
          <p className="sona-login-brand-tagline">Apple Music. Minus Apple.</p>
        </div>
        <LoginForm />
      </main>
    </div>
  )
}
