import { create } from 'zustand'

export type SearchFilter = 'all' | 'songs' | 'albums' | 'artists'
interface MobileSearch {
  term: string
  focused: boolean
  engaged: boolean
  filter: SearchFilter
  setTerm: (term: string) => void
  setFocused: (focused: boolean) => void
  setEngaged: (engaged: boolean) => void
  setFilter: (filter: SearchFilter) => void
  reset: () => void
}
export const useSonaSearch = create<MobileSearch>((set) => ({
  term: '', focused: false, engaged: false, filter: 'all',
  setTerm: (term) => set({ term }),
  setFocused: (focused) => set({ focused }),
  setEngaged: (engaged) => set({ engaged }),
  setFilter: (filter) => set({ filter }),
  reset: () => set({ term: '', focused: false, engaged: false, filter: 'all' }),
}))
