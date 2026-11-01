import type { ReactNode } from 'react'
import { getImmediateCoverArtUrl } from '@/api/httpClient'
import type { CoverArt } from '@/types/coverArtType'

interface ImageLoaderProps {
  id?: string
  type: CoverArt
  size?: string | number
  children: (src: string | undefined, isLoading: boolean) => ReactNode
}
export function ImageLoader({ id, type, size = 300, children }: ImageLoaderProps) {
  return <>{children(!id && type !== 'artist' ? undefined : getImmediateCoverArtUrl(id, type, String(size)), false)}</>
}
