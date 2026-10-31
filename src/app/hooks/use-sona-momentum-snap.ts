import { useRef, type TouchEvent } from 'react'
import type { CarouselApi } from '@/app/components/ui/carousel'

type Sample = { x: number; time: number }
type Gesture = { x: number; y: number; startIndex: number; startTime: number; samples: Sample[] }

/**
 * Fast flicks advance multiple items, based on release velocity and the
 * increase in velocity (acceleration). Slow drags are left to Embla snapping.
 */
export function useSonaMomentumSnap(api: CarouselApi, itemCount: number) {
  const gesture = useRef<Gesture | null>(null)
  function onTouchStartCapture(event: TouchEvent<HTMLElement>) {
    if (event.touches.length !== 1 || !api) return
    const touch = event.touches[0]
    const now = performance.now()
    gesture.current = {
      x: touch.clientX, y: touch.clientY,
      startIndex: api.selectedScrollSnap(), startTime: now,
      samples: [{ x: touch.clientX, time: now }],
    }
  }
  function onTouchMoveCapture(event: TouchEvent<HTMLElement>) {
    const current = gesture.current
    if (!current || event.touches.length !== 1) return
    const x = event.touches[0].clientX
    const time = performance.now()
    current.samples.push({ x, time })
    // Keep only the trailing 100 ms to measure release velocity.
    while (current.samples.length > 2 && time - current.samples[0].time > 110) {
      current.samples.shift()
    }
  }
  function onTouchEndCapture(event: TouchEvent<HTMLElement>) {
    const current = gesture.current
    gesture.current = null
    if (!current || !api || itemCount < 2) return
    const end = event.changedTouches[0]
    const delta = end.clientX - current.x
    const deltaY = end.clientY - current.y
    if (Math.abs(delta) < 23 || Math.abs(delta) < Math.abs(deltaY) * 1.25) return
    const endTime = performance.now()
    const last = current.samples[0]
    const recentSpeed = Math.abs((end.clientX - last.x) / Math.max(12, endTime - last.time))
    const totalSpeed = Math.abs(delta) / Math.max(20, endTime - current.startTime)
    const acceleration = Math.max(0, (recentSpeed - totalSpeed) / Math.max(20, endTime - last.time))
    // More than one card requires a deliberate, sharply accelerating throw.
    // Distance alone never triggers a multi-card jump.
    if (recentSpeed < 1.8 || acceleration < 0.014) return
    const steps = Math.min(3, 2 + Math.floor((acceleration - 0.014) / 0.026))
    const direction = delta < 0 ? 1 : -1
    const target = Math.max(0, Math.min(itemCount - 1,
      current.startIndex + direction * steps))
    // Applied after pointer-up so our target wins over Embla's ordinary snap.
    requestAnimationFrame(() => {
      if (!api) return
      api.scrollTo(target)
    })
  }
  return { onTouchStartCapture, onTouchMoveCapture, onTouchEndCapture }
}
