import './preview-list.css'
import { ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { AlbumGridCard } from '@/app/components/albums/album-grid-card'
import { useMusicRail } from '@/app/hooks/use-music-rail'
import '@/app/components/sona/music-rail.css'
import { CarouselButton } from '@/app/components/ui/carousel-button'
import { Albums } from '@/types/responses/album'

interface PreviewListProps {
  list: Albums[]
  title: string
  showMore?: boolean
  moreTitle?: string
  moreRoute?: string
}

export default function PreviewList({
  list,
  title,
  showMore = true,
  moreTitle,
  moreRoute,
}: PreviewListProps) {
  const { pathname } = useLocation()
  const rail = useMusicRail(Math.min(16, list.length), pathname + ':' + title)
  const { t } = useTranslation()

  moreTitle = moreTitle || t('generic.seeMore')

  if (list.length > 16) {
    list = list.slice(0, 16)
  }

  return (
    <div className="w-full flex flex-col mt-4">
      <div className="sona-preview-heading my-4 flex justify-between items-center">
        <h3
          className="scroll-m-20 text-2xl font-semibold tracking-tight"
          data-testid="preview-list-title"
        >
          {title}
        </h3>
        <div className="flex items-center gap-4">
          {showMore && moreRoute && (
            <Link
              to={
                moreRoute +
                (moreRoute.includes('?') ? '&' : '?') +
                'section=' +
                encodeURIComponent(title)
              }
              aria-label={moreTitle + ' ' + title}
              data-testid="preview-list-show-more"
            >
              <ChevronRight
                className="sona-preview-chevron"
                size={20}
                aria-hidden="true"
              />
              <p className="sona-preview-more-label leading-7 text-sm truncate hover:underline text-muted-foreground hover:text-primary">
                {moreTitle}
              </p>
            </Link>
          )}
          <div className="flex gap-2">
            <CarouselButton
              direction="prev"
              disabled={!rail.previous}
              onClick={() => rail.step(-1)}
              data-testid="preview-list-prev-button"
            />
            <CarouselButton
              direction="next"
              disabled={!rail.next}
              onClick={() => rail.step(1)}
              data-testid="preview-list-next-button"
            />
          </div>
        </div>
      </div>

      <ul
        ref={rail.ref}
        className="sona-music-rail sona-music-rail--albums"
        aria-label={title}
        data-testid="preview-list-carousel"
      >
        {list.map((album, index) => (
          <li
            key={album.id}
            data-testid={`preview-list-carousel-item-${index}`}
          >
            <AlbumGridCard album={album} />
          </li>
        ))}
      </ul>
    </div>
  )
}
