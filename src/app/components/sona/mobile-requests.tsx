import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/store/app.store'
import { saltWord } from '@/utils/salt'
import { getMainScrollElement } from '@/utils/scrollPageToTop'

const PROFILE_URL = 'https://profiles.hippocampus-polaris.ts.net/?embed=sona'
const PROFILE_ORIGIN = 'https://profiles.hippocampus-polaris.ts.net'

/**
 * Music Profiles owns request data. Sona hands it the already validated
 * Subsonic credential so the embedded request page opens without another login.
 */
export default function SonaMobileRequests() {
  const frame = useRef<HTMLIFrameElement>(null)
  const scrollRequestId = useRef(0)
  const scrollAcknowledged = useRef(0)
  const scrollFallbackTimer = useRef<number | null>(null)
  const [frameKey, setFrameKey] = useState(0)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [showLoader, setShowLoader] = useState(true)
  const [error, setError] = useState('')
  const username = useAppStore((state) => state.data.username)
  const token = useAppStore((state) => state.data.password)
  const authType = useAppStore((state) => state.data.authType)

  useEffect(() => {
    const scrollToForm = () => {
      const iframe = frame.current
      if (!iframe?.contentWindow) return
      const requestId = ++scrollRequestId.current
      if (scrollFallbackTimer.current !== null) window.clearTimeout(scrollFallbackTimer.current)
      // Preferred path: scroll within the cross-origin embedded Music Profiles page.
      iframe.contentWindow.postMessage({
        type: 'sona-profile-scroll-to-request', requestId,
      }, PROFILE_ORIGIN)
      // Older NAS deployments may not have the message handler yet. A
      // same-document hash navigation gives Safari a separate, standard
      // anchor-scroll path without requiring access to the iframe's DOM.
      scrollFallbackTimer.current = window.setTimeout(() => {
        if (scrollAcknowledged.current === requestId || frame.current !== iframe) return
        const base = PROFILE_URL.split('#')[0]
        iframe.setAttribute('src', base + '#upload')
      }, 450)
    }
    window.addEventListener('sona:request-scroll-to-form', scrollToForm)
    return () => {
      window.removeEventListener('sona:request-scroll-to-form', scrollToForm)
      if (scrollFallbackTimer.current !== null) window.clearTimeout(scrollFallbackTimer.current)
    }
  }, [])

  function handoffProfileSession() {
    frame.current?.contentWindow?.postMessage({
      type: 'sona-profile-auth', username, token, salt: saltWord, authType,
    }, PROFILE_ORIGIN)
  }

  useEffect(() => {
    const receiveProfileStatus = (event: MessageEvent) => {
      if (event.origin !== PROFILE_ORIGIN || event.source !== frame.current?.contentWindow) return
      if (event.data?.type === 'sona-profile-scroll-complete') {
        if (event.data.requestId === scrollRequestId.current) {
          scrollAcknowledged.current = scrollRequestId.current
          if (scrollFallbackTimer.current !== null) window.clearTimeout(scrollFallbackTimer.current)
        }
      }
      if (event.data?.type === 'sona-profile-handoff-ready') handoffProfileSession()
      if (event.data?.type === 'sona-profile-ready') {
        setError('')
        setStatus('ready')
      }
      if (event.data?.type === 'sona-profile-error') {
        setError(event.data.message || 'Music Requests could not be loaded.')
        setStatus('error')
      }
    }
    window.addEventListener('message', receiveProfileStatus)
    return () => window.removeEventListener('message', receiveProfileStatus)
  }, [username, token, authType])

  useEffect(() => {
    const viewport = getMainScrollElement()
    if (!viewport || status === 'ready') return
    const overflow = viewport.style.overflow
    const touchAction = viewport.style.touchAction
    viewport.style.overflow = 'hidden'
    viewport.style.touchAction = 'none'
    return () => {
      viewport.style.overflow = overflow
      viewport.style.touchAction = touchAction
    }
  }, [status])

  function retry() {
    setError('')
    setStatus('loading')
    setShowLoader(true)
    setFrameKey((value) => value + 1)
  }

  return (
    <main className={'sona-request-page' + (status !== 'ready' ? ' is-loading' : '')}>
      <section className="sona-request-portal" aria-label="Music request portal">
        {showLoader && <div className={'sona-request-loading' + (status === 'ready' ? ' is-leaving' : '')}
          role="status" aria-live="polite" onTransitionEnd={(event) => {
            if (status === 'ready' && event.target === event.currentTarget && event.propertyName === 'opacity') setShowLoader(false)
          }}>
          <div className="sona-request-loading-content">
          {status !== 'error' ? <>
            <span className="sona-request-spinner" aria-hidden="true" />
            <strong>Loading Music Requests</strong>
            <span>Connecting your Sona profile…</span>
          </> : <>
            <strong>Music Requests couldn’t load</strong>
            <span>{error}</span>
            <button type="button" onClick={retry}>Try Again</button>
          </>}
          </div>
        </div>}
        <iframe key={frameKey} ref={frame} title="Music Requests" src={PROFILE_URL}
          allow="clipboard-write" onLoad={handoffProfileSession} />
      </section>
    </main>
  )
}
