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
          <SonaMark size={76} className="sona-login-main-mark" />
        </div>
        <LoginForm />
      </main>
    </div>
  )
}
