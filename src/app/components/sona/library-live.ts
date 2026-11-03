import type { QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/utils/queryKeys'
const keys = new Set<string>([
 ...Object.values(queryKeys.album), ...Object.values(queryKeys.artist),
 ...Object.values(queryKeys.song), ...Object.values(queryKeys.genre),
 ...Object.values(queryKeys.playlist), ...Object.values(queryKeys.favorites),
 'sona-mobile-library-newest','sona-mobile-search-v2','sona-catalog-album',
 'sona-catalog-artist-v2','sona-catalog-artist-local',
])
export function invalidateLibrary(client: QueryClient) {
 return client.invalidateQueries({predicate:query=>keys.has(String(query.queryKey[0]))})
}
