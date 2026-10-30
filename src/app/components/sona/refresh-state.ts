import { create } from 'zustand'

type RefreshState = {
  refreshing: boolean
  setRefreshing: (refreshing: boolean) => void
}
export const useSonaRefresh = create<RefreshState>((set) => ({
  refreshing: false,
  setRefreshing: (refreshing) => set({ refreshing }),
}))
