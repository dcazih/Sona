/** Installed iOS PWAs paint their own safe area; don't recolor browser chrome. */
export function isStandalonePwa() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  )
}
