import { useEffect, useLayoutEffect, useRef, useState } from 'react'

// Preserve each list position when its route unmounts.
const positions = new Map<string, number>()

/** Native scrolling owns gestures; JS restores position and operates arrows. */
export function useMusicRail(itemCount: number, positionKey?: string) {
  const ref = useRef<HTMLUListElement>(null)
  const [edges, setEdges] = useState({ previous: false, next: false })

  useLayoutEffect(() => {
    const rail = ref.current
    if (!rail || !positionKey) return
    rail.scrollLeft = positions.get(positionKey) ?? 0
    return () => {
      positions.set(positionKey, rail.scrollLeft)
      if (positions.size > 64) positions.delete(positions.keys().next().value!)
    }
  }, [positionKey])

  useEffect(() => {
    const rail = ref.current
    if (!rail) return
    const update = () => {
      const previous = rail.scrollLeft > 1
      const next = rail.scrollLeft < rail.scrollWidth - rail.clientWidth - 1
      setEdges(old => old.previous === previous && old.next === next
        ? old : { previous, next })
    }
    update()
    rail.addEventListener('scroll', update, { passive: true })
    const observer = new ResizeObserver(update)
    observer.observe(rail)
    return () => {
      rail.removeEventListener('scroll', update)
      observer.disconnect()
    }
  }, [itemCount])

  function step(direction: -1 | 1) {
    const rail = ref.current
    const first = rail?.firstElementChild as HTMLElement | null
    if (!rail || !first) return
    const second = first.nextElementSibling as HTMLElement | null
    const stride = second ? second.offsetLeft - first.offsetLeft : first.offsetWidth
    rail.scrollBy({ left: direction * stride,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }

  return { ref, ...edges, step }
}
