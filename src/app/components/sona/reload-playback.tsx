import { useEffect } from 'react'
import { idbStorage } from '@/store/idb'
import { usePlayerStore } from '@/store/player.store'
import type { ISongList } from '@/types/playerContext'
import type { ISong } from '@/types/responses/song'

const KEY = 'sona:reload-playback-v2'
const EXPIRATION_MS = 5 * 60 * 1000
type Snapshot = {
  id: string
  progress: number
  playing: boolean
  savedAt: number
  song?: ISong
}

function saveSnapshot() {
  const state = usePlayerStore.getState()
  const song = state.songlist.currentList[state.songlist.currentSongIndex] || state.songlist.currentSong
  try {
    if (!song?.id) return
    const snapshot: Snapshot = {
      id: song.id,
      progress: Math.max(0, state.playerProgress.progress || 0),
      playing: state.playerState.isPlaying,
      savedAt: Date.now(),
      song,
    }
    sessionStorage.setItem(KEY, JSON.stringify(snapshot))
  } catch {
    // Session storage is optional. Do not affect playback in private mode.
  }
}

function readSnapshot(): Snapshot | null {
  try {
    const value = sessionStorage.getItem(KEY)
    if (!value) return null
    const item = JSON.parse(value) as Snapshot
    if (!item.id || Date.now() - item.savedAt > EXPIRATION_MS) {
      sessionStorage.removeItem(KEY)
      return null
    }
    return item
  } catch { return null }
}

/**
 * Restores the same song, queue and seek position on a real page reload.
 * IndexedDB restoration is asynchronous, so rehydrate it explicitly before
 * initiating playback. iOS/browser autoplay policy can still require a tap.
 */
export function SonaReloadPlayback() {
  useEffect(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    const snapshot = nav?.type === 'reload' ? readSnapshot() : null
    let handled = !snapshot
    let pending = Boolean(snapshot)
    let lastSavedProgress = -1

    function restore() {
      if (handled || !snapshot) return
      const state = usePlayerStore.getState()
      const song = state.songlist.currentList[state.songlist.currentSongIndex] || state.songlist.currentSong
      if (!song?.id) return

      if (song.id !== snapshot.id) {
        // A user selected a different song while the old library was loading.
        handled = true
        pending = false
        return
      }

      handled = true
      pending = false
      state.actions.setProgress(snapshot.progress)
      // If metadata is already loaded, also seek the actual HTML audio player.
      const audio = state.playerState.audioPlayerRef
      if (audio && audio.readyState >= 1) {
        try { audio.currentTime = snapshot.progress } catch { /* ignore */ }
      }
      state.actions.setPlayingState(snapshot.playing)
    }

    if (pending) {
      // This queue is persisted separately by the upstream player.
      // Its asynchronous IndexedDB load does not update Zustand automatically.
      idbStorage.getItem<ISongList>('player_songlist', (stored) => {
        if (handled || !snapshot) return
        const state = usePlayerStore.getState()
        if (state.songlist.currentList.length === 0 && stored?.currentList?.length) {
          const matching = stored.currentList[stored.currentSongIndex]?.id === snapshot.id
          if (matching) {
            usePlayerStore.setState({ songlist: stored })
          }
        }
        if (usePlayerStore.getState().songlist.currentList.length === 0 && snapshot.song) {
          const previous = usePlayerStore.getState()
          usePlayerStore.setState({
            songlist: {
              ...previous.songlist,
              currentSong: snapshot.song,
              currentSongIndex: 0,
              originalSongIndex: 0,
              currentList: [snapshot.song],
              originalList: [snapshot.song],
              shuffledList: [snapshot.song],
            },
            playerState: { ...previous.playerState, mediaType: 'song' },
          })
        }
        restore()
      })
    }

    const unsubscribe = usePlayerStore.subscribe((state, before) => {
      if (pending) restore()
      if (state.playerState.isPlaying !== before.playerState.isPlaying ||
        state.songlist.currentSongIndex !== before.songlist.currentSongIndex ||
        Math.abs(state.playerProgress.progress - lastSavedProgress) >= 5) {
        lastSavedProgress = state.playerProgress.progress
        if (!pending) saveSnapshot()
      }
    })
    if (pending) restore()

    const onHide = () => saveSnapshot()
    window.addEventListener('pagehide', onHide)
    window.addEventListener('beforeunload', onHide)
    return () => {
      unsubscribe()
      window.removeEventListener('pagehide', onHide)
      window.removeEventListener('beforeunload', onHide)
    }
  }, [])
  return null
}
