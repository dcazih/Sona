import { create } from 'zustand'

export const tabRoots = [
  '/',
  '/mobile-new',
  '/mobile-request',
  '/mobile-library',
] as const
function savedTab() {
  try {
    const value = Number(sessionStorage.getItem('sona-active-tab'))
    return Number.isInteger(value) && value >= 0 && value < 4 ? value : 0
  } catch {
    return 0
  }
}
interface DockState {
  selected: number
  compact: boolean
  returnRoute: string
  select: (index: number) => void
  setCompact: (compact: boolean) => void
  setReturnRoute: (route: string) => void
}
export const useSonaDock = create<DockState>((set) => ({
  selected: savedTab(),
  compact: false,
  returnRoute: '/',
  select: (index) => {
    try {
      sessionStorage.setItem('sona-active-tab', String(index))
    } catch {}
    set({ selected: index })
  },
  setCompact: (compact) =>
    set((state) => (state.compact === compact ? state : { compact })),
  setReturnRoute: (returnRoute) => set({ returnRoute }),
}))
