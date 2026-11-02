import { useAppStore } from '@/store/app.store'
import { saltWord } from '@/utils/salt'
import type { ISong } from '@/types/responses/song'
import type { SingleAlbum } from '@/types/responses/album'

export type CatalogItem = {
  id: string; kind: 'song' | 'album' | 'artist'; title: string; artist: string
  album?: string; albumId?: string; cover?: string; year?: number; duration?: number
  track?: number; requestable?: boolean; localSong?: ISong | null
}
export type CatalogAlbum = CatalogItem & { tracks: CatalogItem[]; localAlbum?: SingleAlbum | null }
export type RequestStatus = { kind: 'track' | 'album'; id: string; mbid: string; state: string; text: string }
let session: { identity: string; token: Promise<string> } | undefined
function identity() {
  const { url, username, password, authType } = useAppStore.getState().data
  return JSON.stringify([url, username, password, authType])
}
async function profileToken() {
  const key = identity()
  if (session?.identity === key) return session.token
  const { username, password, authType } = useAppStore.getState().data
  const token = fetch('/sona-api/auth/sona-token', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ navidrome_username: username, token: password, salt: saltWord, auth_type: authType }),
  }).then(async response => {
    const data = await response.json()
    if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Could not connect your request profile.')
    return data.profile_token as string
  }).catch(error => { if (session?.identity === key) session = undefined; throw error })
  session = { identity: key, token }
  return token
}
export async function catalogFetch(path: string, options: RequestInit = {}, retry = true): Promise<Response> {
  const key = identity(), token = await profileToken()
  if (identity() !== key) throw new Error('Your account changed. Try again.')
  const response = await fetch('/sona-api/' + path, { ...options, headers: {
    ...options.headers, Authorization: 'Bearer ' + token,
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
  } })
  if (response.status === 401 && retry) { session = undefined; return catalogFetch(path, options, false) }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(typeof data.detail === 'string' ? data.detail : 'Music Requests could not be reached. Try again.')
  }
  return response
}
export async function catalogGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  return (await catalogFetch(path, { signal })).json()
}
export async function requestCatalogItem(item: CatalogItem) {
  const result = await (await catalogFetch('sona/request', {
    method: 'POST', body: JSON.stringify({ kind: item.kind, id: item.id, album_id: item.albumId || '' }),
  })).json() as { status: string; message?: string }
  window.dispatchEvent(new Event('sona:requests-changed'))
  return result
}
export const catalogProfile = () => {
  const { url, username } = useAppStore.getState().data
  return url + '|' + username
}
export const pendingRequest = (state?: string) => Boolean(state && ['checking','new','submitting','requested','awaiting_approval','importing','queued','downloading','processing'].includes(state))
