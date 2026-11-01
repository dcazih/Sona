import type { ISong } from '@/types/responses/song'

export function SongExplicitMark({ song }: { song: Pick<ISong, 'explicitStatus'> }) {
  return song.explicitStatus?.toLowerCase() === 'explicit'
    ? <span className="sona-song-explicit" aria-label="Explicit">E</span> : null
}
