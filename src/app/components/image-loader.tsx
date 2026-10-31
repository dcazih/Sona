import { ReactNode, useEffect, useRef, useState } from 'react'
import { getImmediateCoverArtUrl } from '@/api/httpClient'
import { CoverArt } from '@/types/coverArtType'

interface ImageLoaderProps {
  id?: string
  type: CoverArt
  size?: string | number
  children: (src: string | undefined, isLoading: boolean) => ReactNode
}

export function ImageLoader({
  id,
  type,
  size = 300,
  children,
}: ImageLoaderProps) {
  const immediate = () => getImmediateCoverArtUrl(id, type, size.toString())
  const [src, setSrc] = useState<string>(immediate)
  const [isLoading, setIsLoading] = useState(false)
  const lastKey = useRef('')

  useEffect(() => {
    const key = `${type}:${id || ''}:${size}`
    if (lastKey.current === key) return
    lastKey.current = key
    setSrc(immediate())
    setIsLoading(false)
  }, [id, type, size])

  return <>{children(src, isLoading)}</>
}
