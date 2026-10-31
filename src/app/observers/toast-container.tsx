import { useEffect } from 'react'
import { AlertTriangle, Check, Info, LoaderCircle, Music2, X } from 'lucide-react'
import { cssTransition, toast, ToastContainer as Container } from 'react-toastify'
import type { TypeOptions } from 'react-toastify'

const ToastMotion = cssTransition({
  enter: 'sona-toast-enter',
  exit: 'sona-toast-exit',
  collapse: false,
})

function ToastStatusIcon({ type, isLoading }: { type: TypeOptions; isLoading?: boolean }) {
  const status = isLoading ? 'loading' : type
  const Icon = status === 'success' ? Check
    : status === 'error' ? X
    : status === 'warning' ? AlertTriangle
    : status === 'info' ? Info
    : status === 'loading' ? LoaderCircle
    : Music2
  return <span className={'sona-toast-status sona-toast-status-' + status} aria-hidden="true">
    <Icon size={16} strokeWidth={2.5} className={status === 'loading' ? 'sona-toast-spin' : ''} />
  </span>
}

/**
 * Swipe up to dismiss. React-Toastify's built-in vertical drag dismisses in
 * both directions. Use an upward-only gesture so downward swipes do nothing.
 */
function useSwipeUpDismiss() {
  useEffect(() => {
    let drag: { id: number; x: number; y: number; element: HTMLElement } | null = null
    const start = (event: PointerEvent) => {
      if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return
      const element = event.target instanceof Element
        ? event.target.closest<HTMLElement>('.sona-toast')
        : null
      if (!element) return
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, element }
    }
    const move = (event: PointerEvent) => {
      if (!drag || drag.id !== event.pointerId) return
      const dy = event.clientY - drag.y
      const dx = event.clientX - drag.x
      if (dy >= 0 || Math.abs(dy) < Math.abs(dx)) return
      drag.element.dataset.swiping = 'true'
      drag.element.style.translate = '0 ' + Math.max(-88, dy) + 'px'
      drag.element.style.opacity = String(Math.max(.35, 1 + dy / 140))
    }
    const end = (event: PointerEvent) => {
      if (!drag || drag.id !== event.pointerId) return
      const { element, y, x } = drag
      const dy = event.clientY - y
      const dx = event.clientX - x
      drag = null
      element.removeAttribute('data-swiping')
      element.style.translate = ''
      element.style.opacity = ''
      if (dy < -42 && -dy > Math.abs(dx) * 1.15 && element.id) {
        toast.dismiss(element.id)
      }
    }
    const cancel = (event: PointerEvent) => {
      if (!drag || drag.id !== event.pointerId) return
      drag.element.style.translate = ''
      drag.element.style.opacity = ''
      drag.element.removeAttribute('data-swiping')
      drag = null
    }
    document.addEventListener('pointerdown', start, { passive: true })
    document.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('pointerup', end, { passive: true })
    document.addEventListener('pointercancel', cancel, { passive: true })
    return () => {
      document.removeEventListener('pointerdown', start)
      document.removeEventListener('pointermove', move)
      document.removeEventListener('pointerup', end)
      document.removeEventListener('pointercancel', cancel)
    }
  }, [])
}

export function ToastContainer() {
  useSwipeUpDismiss()
  return <Container
    containerClassName="sona-toast-container"
    toastClassName="sona-toast"
    bodyClassName="sona-toast-body"
    icon={({ type, isLoading }) => <ToastStatusIcon type={type} isLoading={isLoading} />}
    transition={ToastMotion}
    position="top-center"
    newestOnTop
    limit={2}
    stacked={false}
    autoClose={2000}
    hideProgressBar
    pauseOnHover={false}
    pauseOnFocusLoss={false}
    closeOnClick={false}
    closeButton={false}
    draggable={false}
  />
}
