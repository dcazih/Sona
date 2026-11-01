import { RouterProvider } from 'react-router-dom'
import { useEffect } from 'react'
import { Linux } from '@/app/components/controls/linux'
import { SettingsDialog } from '@/app/components/settings/dialog'
import { LangObserver } from '@/app/observers/lang-observer'
import { MediaSessionObserver } from '@/app/observers/media-session-observer'
import { ThemeObserver } from '@/app/observers/theme-observer'
import { ToastContainer } from '@/app/observers/toast-container'
import { UpdateObserver } from '@/app/observers/update-observer'
import { router } from '@/routes/router'
import { isDesktop as isElectron, isLinux } from '@/utils/desktop'

function StartupReadyObserver() {
  useEffect(() => {
    let signalled = false
    let raf = 0
    const verify = () => {
      if (signalled) return
      // A rendered login or routed music shell is enough for the initial
      // splash; data queries can continue loading within their own pages.
      const page = document.querySelector('.sona-login-screen, .sona-app-shell')
      if (!page || !router.state.initialized) return
      signalled = true
      raf = window.requestAnimationFrame(() => {
        document.dispatchEvent(new Event('sona:ready'))
      })
    }
    const unsubscribe = router.subscribe(verify)
    const poll = window.setInterval(verify, 100)
    verify()
    return () => {
      unsubscribe()
      window.clearInterval(poll)
      window.cancelAnimationFrame(raf)
    }
  }, [])
  return null
}

function App() {
  return (
    <>
      {isElectron() && <UpdateObserver />}
      <MediaSessionObserver />
      <LangObserver />
      <ThemeObserver />
      <SettingsDialog />
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
      <StartupReadyObserver />
      <ToastContainer />
      {isLinux && <Linux />}
    </>
  )
}

export default App
