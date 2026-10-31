const DISCOVERY_URL = 'https://discover.hippocampus-polaris.ts.net/'

/**
 * The request service remains the authentication owner. Its outer chrome is
 * cropped so the portal reads as a flat, inline Sona page.
 */
export default function SonaMobileRequests() {
  return (
    <main className="sona-request-page">
      <section className="sona-request-my" aria-labelledby="sona-my-requests-heading">
        <h1 id="sona-my-requests-heading">My Requests</h1>
        <p>Your active and completed music requests appear first.</p>
      </section>
      <section className="sona-request-portal" aria-label="Music request portal">
        <iframe title="Music Requests" src={DISCOVERY_URL} allow="clipboard-write" />
      </section>
    </main>
  )
}
