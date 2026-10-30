import { AppTitle } from '@/app/components/header/app-title'
import { LoginForm } from '@/app/components/login/form'

export default function Login() {
  return (
    <div className="sona-login-screen">
      <div className="sona-login-glow sona-login-glow-one" aria-hidden="true" />
      <div className="sona-login-glow sona-login-glow-two" aria-hidden="true" />
      <header className="sona-login-topbar">
        <AppTitle />
        <span className="sona-login-topbar-tag">YOUR MUSIC, YOUR WAY</span>
      </header>
      <main className="sona-login-main">
        <div className="sona-login-intro">
          <div className="sona-login-art" aria-hidden="true">
            <div className="sona-login-art-back" />
            <div className="sona-login-art-front">
              <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
                <path d="M18 32V12L36 8V28" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
                <ellipse cx="12.5" cy="34" rx="8" ry="5.5" fill="currentColor" transform="rotate(-18 12.5 34)" />
                <ellipse cx="30.5" cy="29.5" rx="8" ry="5.5" fill="currentColor" transform="rotate(-18 30.5 29.5)" />
              </svg>
            </div>
          </div>
          <p className="sona-login-eyebrow">YOUR MUSIC, ALL IN ONE PLACE</p>
          <h1>Welcome to <span>Sona.</span></h1>
          <p className="sona-login-subtitle">Your collection. Your playlists. Your sound.</p>
        </div>
        <LoginForm />
        <p className="sona-login-footnote">A private connection to your music library.</p>
      </main>
    </div>
  )
}
