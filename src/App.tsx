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
    // Router loaders can still be waiting on Navidrome while React has mounted.
    // Only release the native/HTML splash when an actual usable app or login shell exists.
    const verify = () => {
      if (signalled || !router.state.initialized) return
      const ready = document.querySelector('.sona-login-screen, .sona-app-shell #main-scroll-area')
      if (!ready) return
      signalled = true
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        document.dispatchEvent(new Event('sona:ready'))
      })
    }
    const unsubscribe = router.subscribe(verify)
    const poll = window.setInterval(verify, 120)
    verify()
    return () => {
      unsubscribe()
      window.clearInterval(poll)
      cancelAnimationFrame(raf)
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
      <RouterProvider router={router} />
      <StartupReadyObserver />
      <ToastContainer />
      {isLinux && <Linux />}
    </>
  )
}

export default App
