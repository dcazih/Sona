import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/store/app.store'
import { saltWord } from '@/utils/salt'

const PROFILE_URL = 'https://profiles.hippocampus-polaris.ts.net/?embed=sona'
const PROFILE_ORIGIN = 'https://profiles.hippocampus-polaris.ts.net'

/**
 * Music Profiles owns request data. Sona hands it the already validated
 * Subsonic credential so the embedded request page opens without another login.
 */
export default function SonaMobileRequests() {
  const frame = useRef<HTMLIFrameElement>(null)
  const [frameKey, setFrameKey] = useState(0)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [showLoader, setShowLoader] = useState(true)
  const [error, setError] = useState('')
  const username = useAppStore((state) => state.data.username)
  const token = useAppStore((state) => state.data.password)
  const authType = useAppStore((state) => state.data.authType)

  function handoffProfileSession() {
    frame.current?.contentWindow?.postMessage({
      type: 'sona-profile-auth', username, token, salt: saltWord, authType,
    }, PROFILE_ORIGIN)
  }

  useEffect(() => {
    const receiveProfileStatus = (event: MessageEvent) => {
      if (event.origin !== PROFILE_ORIGIN || event.source !== frame.current?.contentWindow) return
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

  function retry() {
    setError('')
    setStatus('loading')
    setShowLoader(true)
    setFrameKey((value) => value + 1)
  }

  return (
    <main className="sona-request-page">
      <section className="sona-request-portal" aria-label="Music request portal">
        {showLoader && <div className={'sona-request-loading' + (status === 'ready' ? ' is-leaving' : '')}
          role="status" aria-live="polite" onTransitionEnd={(event) => {
            if (status === 'ready' && event.propertyName === 'opacity') setShowLoader(false)
          }}>
          {status !== 'error' ? <>
            <span className="sona-request-spinner" aria-hidden="true" />
            <strong>Loading Music Requests</strong>
            <span>Connecting your Sona profile…</span>
          </> : <>
            <strong>Music Requests couldn’t load</strong>
            <span>{error}</span>
            <button type="button" onClick={retry}>Try Again</button>
          </>}
        </div>}
        <iframe key={frameKey} ref={frame} title="Music Requests" src={PROFILE_URL}
          allow="clipboard-write" onLoad={handoffProfileSession} />
      </section>
    </main>
  )
}
