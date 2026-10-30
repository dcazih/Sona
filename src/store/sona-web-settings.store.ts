import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AudioFormat = 'original' | 'mp3'
export type ReleaseSource = 'musicbrainz' | 'discogs'

interface SonaWebSettings {
  continueAcrossDevices: boolean
  crossfadeSeconds: number
  gaplessAlbums: boolean
  cacheTracks: number
  cacheFormat: AudioFormat
  cellularCache: boolean
  downloadFormat: AudioFormat
  listenBrainzUser: string
  listenBrainzToken: string
  audioMuseUrl: string
  openReleasesIn: ReleaseSource
  set: <K extends keyof Omit<SonaWebSettings, 'set'>>(key: K, value: SonaWebSettings[K]) => void
}

const defaults = {
  continueAcrossDevices: false,
  crossfadeSeconds: 0,
  gaplessAlbums: true,
  cacheTracks: 5,
  cacheFormat: 'original' as AudioFormat,
  cellularCache: false,
  downloadFormat: 'original' as AudioFormat,
  listenBrainzUser: '',
  listenBrainzToken: '',
  audioMuseUrl: '',
  openReleasesIn: 'musicbrainz' as ReleaseSource,
}

export const useSonaWebSettings = create<SonaWebSettings>()(
  persist(
    (set) => ({
      ...defaults,
      set: (key, value) => set({ [key]: value } as Partial<SonaWebSettings>),
    }),
    { name: 'sona-web-settings' },
  ),
)
