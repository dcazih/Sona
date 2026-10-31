import { useRef } from 'react'
import { useAppStore } from '@/store/app.store'
import { saltWord } from '@/utils/salt'

const PROFILE_URL = 'https://profiles.hippocampus-polaris.ts.net/?embed=sona'

/**
 * Music Profiles owns request data. Sona hands it the already validated
 * Subsonic credential so the embedded request page opens without another login.
 */
export default function SonaMobileRequests() {
  const frame = useRef<HTMLIFrameElement>(null)
  const username = useAppStore((state) => state.data.username)
  const token = useAppStore((state) => state.data.password)
  const authType = useAppStore((state) => state.data.authType)

  function handoffProfileSession() {
    frame.current?.contentWindow?.postMessage({
      type: 'sona-profile-auth', username, token, salt: saltWord, authType,
    }, 'https://profiles.hippocampus-polaris.ts.net')
  }

  return (
    <main className="sona-request-page">
      <section className="sona-request-portal" aria-label="Music request portal">
        <iframe ref={frame} title="Music Requests" src={PROFILE_URL}
          allow="clipboard-write" onLoad={handoffProfileSession} />
      </section>
    </main>
  )
}
