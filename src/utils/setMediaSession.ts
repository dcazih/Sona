import { getSimpleCoverArtUrl } from '@/api/httpClient'
import { usePlayerStore } from '@/store/player.store'
import { EpisodeWithPodcast } from '@/types/responses/podcasts'
import { ISong } from '@/types/responses/song'

const artworkSizes = ['96', '128', '192', '256', '384', '512']

function removeMediaSession() {
  if (!navigator.mediaSession) return

  navigator.mediaSession.metadata = null
}

function setMediaSession(song: ISong) {
  if (!navigator.mediaSession) return

  navigator.mediaSession.metadata = new MediaMetadata({
    title: song.title,
    artist: song.artist,
    album: song.album,
    artwork: artworkSizes.map((size): MediaImage => {
      return {
        src: getSimpleCoverArtUrl(song.coverArt, 'song', size),
        sizes: [size, size].join('x'),
        type: 'image/jpeg',
      }
    }),
  })
}

function setPodcastMediaSession(episode: EpisodeWithPodcast) {
  if (!navigator.mediaSession) return

  navigator.mediaSession.metadata = new MediaMetadata({
    title: episode.title,
    album: episode.podcast.title,
    artist: episode.podcast.author,
    artwork: [
      {
        src: episode.image_url,
        sizes: '',
        type: 'image/jpeg',
      },
    ],
  })
}

async function setRadioMediaSession(label: string, radioName: string) {
  if (!navigator.mediaSession) return

  navigator.mediaSession.metadata = new MediaMetadata({
    title: radioName,
    artist: label,
    album: '',
    artwork: [
      {
        src: '',
        sizes: '',
        type: '',
      },
    ],
  })
}

function setPlaybackState(state: boolean | null) {
  if (!navigator.mediaSession) return

  if (state === null) { navigator.mediaSession.playbackState = 'none'; return }

  if (state) {
    navigator.mediaSession.playbackState = 'playing'
  } else {
    navigator.mediaSession.playbackState = 'paused'
  }
}

export function requestMediaPlayback(playing: boolean) {
  const state = usePlayerStore.getState()
  const audio = state.playerState.audioPlayerRef
  if (!playing) {
    audio?.pause()
    state.actions.setPlayingState(false)
    return
  }
  // Invoke native play in the OS media-action callback, before yielding to React.
  // A repeated Play command must never toggle back to Pause.
  if (audio) {
    if (audio.error || audio.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
      const position = audio.currentTime || state.playerProgress.progress || 0
      audio.addEventListener('loadedmetadata', () => {
        if (Number.isFinite(audio.duration) && position < audio.duration) audio.currentTime = position
      }, {once:true})
      audio.load()
    }
    const savedPosition = state.playerProgress.progress || 0
    if (audio.currentTime < 1 && savedPosition > 1) {
      try { audio.currentTime = savedPosition } catch { /* loadedmetadata applies persisted seek */ }
    }
    void audio.play().catch(() => { if (audio.paused) state.actions.setPlayingState(false) })
  }
  state.actions.setPlayingState(true)
}

function setHandlers() {
  const { mediaSession } = navigator
  if (!mediaSession) return

  const state = usePlayerStore.getState()
  const { playNextSong, playPrevSong } = state.actions

  mediaSession.setActionHandler('seekbackward', null)
  mediaSession.setActionHandler('seekforward', null)

  mediaSession.setActionHandler('play', () => requestMediaPlayback(true))
  mediaSession.setActionHandler('pause', () => requestMediaPlayback(false))
  mediaSession.setActionHandler('previoustrack', () => playPrevSong())
  mediaSession.setActionHandler('nexttrack', () => playNextSong())
}

interface SetPodcastHandlerParams {
  handleSeekAction: (value: number) => void
}

function setPodcastHandlers({ handleSeekAction }: SetPodcastHandlerParams) {
  const { mediaSession } = navigator
  if (!mediaSession) return


  mediaSession.setActionHandler('previoustrack', null)
  mediaSession.setActionHandler('nexttrack', null)

  mediaSession.setActionHandler('play', () => requestMediaPlayback(true))
  mediaSession.setActionHandler('pause', () => requestMediaPlayback(false))
  mediaSession.setActionHandler('seekbackward', () => handleSeekAction(-15))
  mediaSession.setActionHandler('seekforward', () => handleSeekAction(30))
}

export const manageMediaSession = {
  removeMediaSession,
  setMediaSession,
  setRadioMediaSession,
  setPodcastMediaSession,
  setPlaybackState,
  setHandlers,
  setPodcastHandlers,
}
