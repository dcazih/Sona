import { useEffect, useState, type ImgHTMLAttributes } from 'react'
import { Music2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src?: string
  wrapperClassName?: string
}

/** Keeps the Sona note visible until artwork has actually decoded successfully. */
export function ArtworkImage({
  src,
  alt = '',
  className,
  wrapperClassName,
  onLoad,
  onError,
  ...props
}: Props) {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => setLoaded(false), [src])

  return (
    <span className={cn('sona-artwork-shell', wrapperClassName)}>
      {!loaded && (
        <span className="sona-artwork-note-fallback" aria-hidden="true">
          <Music2 />
        </span>
      )}
      {src && (
        <img
          {...props}
          src={src}
          alt={alt}
          className={cn('sona-artwork-managed', loaded && 'is-loaded', className)}
          onLoad={(event) => {
            setLoaded(true)
            onLoad?.(event)
          }}
          onError={(event) => {
            setLoaded(false)
            onError?.(event)
          }}
        />
      )}
    </span>
  )
}
