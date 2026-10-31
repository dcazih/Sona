import { del, keys } from 'idb-keyval'
import { queryClient } from '@/lib/queryClient'
import { queryKeys } from '@/utils/queryKeys'

const IDB_CACHE_PREFIXES = ['lyrics:', 'animated-artwork:']
const IMAGE_CACHE_NAME = 'images'
const SONA_CACHE_NAMES = [
  'sona-images-v2', 'sona-images-v3', 'sona-app-v7', 'sona-media-v1',
]

async function clearIndexedDbCaches() {
  const allKeys = await keys()
  const targeted = allKeys.filter(
    (key): key is string =>
      typeof key === 'string' &&
      IDB_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix)),
  )

  await Promise.all(targeted.map((key) => del(key)))
}

async function clearImageCacheStorage() {
  if (typeof caches === 'undefined') return

  try {
    await Promise.all([IMAGE_CACHE_NAME, ...SONA_CACHE_NAMES].map((name) => caches.delete(name)))
  } catch {}
}

function invalidateInMemoryCaches() {
  queryClient.removeQueries({ queryKey: [queryKeys.song.lyrics] })
  queryClient.removeQueries({ queryKey: [queryKeys.album.animatedArtwork] })
}

export async function clearAllCaches() {
  await Promise.all([clearIndexedDbCaches(), clearImageCacheStorage()])
  invalidateInMemoryCaches()
}
