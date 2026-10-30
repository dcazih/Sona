import { useEffect } from 'react'
import { usePlayerStore } from '@/store/player.store'

const KEY = 'sona:reload-playback'
const EXPIRES_MS = 120000
type Snapshot = { id: string; progress: number; playing: boolean; savedAt: number }
function read(): Snapshot | null {
  try {
    const item = sessionStorage.getItem(KEY)
    if (!item) return null
    const value = JSON.parse(item) as Snapshot
    if (!value?.id || Date.now() - value.savedAt > EXPIRES_MS) {
      sessionStorage.removeItem(KEY)
      return null
    }
    return value
  } catch { return null }
}
function save() {
  const state = usePlayerStore.getState()
  const id = state.songlist.currentSong?.id
    || state.songlist.currentList[state.songlist.currentSongIndex]?.id
  try {
    if (!id) { sessionStorage.removeItem(KEY); return }
    sessionStorage.setItem(KEY, JSON.stringify({
      id, progress: state.playerProgress.progress,
      playing: state.playerState.isPlaying, savedAt: Date.now(),
    } satisfies Snapshot))
  } catch { /* Storage can be disabled in private mode. */ }
}

/**
 * Restore the previous playing state on a browser reload.
 * Browser autoplay policy may still require a fresh user gesture on iOS.
 */
export function SonaReloadPlayback() {
  useEffect(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    const reloaded = navigation?.type === 'reload'
    const stored = reloaded ? read() : null
    let handled = !stored || !stored.playing
    let attempts = 0

    function tryRestore() {
      if (handled || !stored) return
      const state = usePlayerStore.getState()
      const song = state.songlist.currentSong?.id
        || state.songlist.currentList[state.songlist.currentSongIndex]?.id
      if (!song) return
      if (song !== stored.id) {
        handled = true
        sessionStorage.removeItem(KEY)
        return
      }
      handled = true
      // Reuse the original stream URL and store queue. Do not advance or replay
      // the song from the beginning if a prior position was retained.
      state.actions.setProgress(Math.max(0, stored.progress || 0))
      state.actions.setPlayingState(true)
      sessionStorage.removeItem(KEY)
    }

    const unsubscribe = usePlayerStore.subscribe(() => {
      if (!handled && ++attempts < 3000) tryRestore()
    })
    tryRestore()
    window.addEventListener('pagehide', save)
    window.addEventListener('beforeunload', save)
    return () => {
      unsubscribe()
      window.removeEventListener('pagehide', save)
      window.removeEventListener('beforeunload', save)
    }
  }, [])
  return null
}
