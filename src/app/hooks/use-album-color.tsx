import { useState } from 'react'
import { getAverageColor } from '@/utils/getAverageColor'

export function useAlbumColor(imageId: string) {
  const [bgColor, setBgColor] = useState('')

  function getImage() {
    return document.getElementById(imageId) as HTMLImageElement
  }

  async function handleLoadImage() {
    const img = getImage()
    if (!img) return

    let color = '#554253'

    try {
      color = (await getAverageColor(img)).hex
    } catch (_) {
      console.warn(
        'handleLoadImage: unable to get image color. Using a stable fallback.',
      )
    }

    setBgColor(color)
  }

  function handleError() {
    const img = getImage()
    if (!img) return

    img.crossOrigin = null
  }

  return { bgColor, handleLoadImage, handleError }
}
