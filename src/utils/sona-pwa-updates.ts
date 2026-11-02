type UpdateOptions = {
  serviceWorker?: ServiceWorkerContainer
  canReload: () => boolean
  reload?: () => void
}

/** Refresh an installed app after a worker update, without interrupting music or typing. */
export function installSonaPwaUpdates(
  registration: Pick<ServiceWorkerRegistration, 'update'>,
  options: UpdateOptions,
) {
  const worker = options.serviceWorker || navigator.serviceWorker
  const reload = options.reload || (() => window.location.reload())
  let controlled = Boolean(worker.controller)
  let pending = false
  const flush = () => {
    if (
      !pending ||
      document.visibilityState !== 'visible' ||
      !options.canReload()
    )
      return
    pending = false
    reload()
  }
  const changed = () => {
    // The first claim of an uncontrolled page already contains the new bundle.
    pending = controlled
    controlled = true
    flush()
  }
  const check = () => {
    if (document.visibilityState !== 'visible') return
    flush()
    void registration.update().catch(() => {})
  }
  const blur = () => requestAnimationFrame(flush)
  worker.addEventListener('controllerchange', changed)
  document.addEventListener('visibilitychange', check)
  window.addEventListener('pageshow', check)
  window.addEventListener('focusout', blur)
  return {
    flush,
    check,
    dispose: () => {
      worker.removeEventListener('controllerchange', changed)
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('pageshow', check)
      window.removeEventListener('focusout', blur)
    },
  }
}
