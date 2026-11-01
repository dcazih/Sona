import type { ReactNode } from 'react'
/**
 * Mobile New tab placeholder. Future section screenshots will replace this
 * page without affecting the rest of Sona's routes.
 */
export default function SonaMobileNew({ label = "New", children }: {label?:string;children?:ReactNode}) {
  return (
    <section className="sona-new-placeholder" aria-label={label}>
      <div className="sona-new-placeholder-message">
        <img src="/sona-screwdriver-wrench.svg" alt="" aria-hidden="true" />
        <p>Still working on this one…</p>
      </div>
      {children}
    </section>
  )
}
