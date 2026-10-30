import { GripVertical, Music2, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { ImageLoader } from '@/app/components/image-loader'
import { usePlayerActions, usePlayerSonglist } from '@/store/player.store'

type DragState = { from: number; to: number; pointerId: number }

export function SonaMobileQueue() {
  const { currentList, currentSongIndex } = usePlayerSonglist()
  const { setSongList, reorderQueue, removeSongFromQueue } = usePlayerActions()
  const drag = useRef<DragState | null>(null)
  const [dragging, setDragging] = useState<number | null>(null)
  const [hovered, setHovered] = useState<number | null>(null)

  function startDrag(event: React.PointerEvent<HTMLButtonElement>, index: number) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    event.preventDefault()
    drag.current = { from: index, to: index, pointerId: event.pointerId }
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging(index)
    setHovered(index)
  }

  function moveDrag(event: React.PointerEvent<HTMLButtonElement>) {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return
    const element = document.elementFromPoint(event.clientX, event.clientY)
    const row = element?.closest('[data-sona-queue-index]')
    const position = Number(row?.getAttribute('data-sona-queue-index'))
    if (row && Number.isInteger(position) && position >= 0 && position < currentList.length) {
      drag.current.to = position
      setHovered(position)
    }
  }

  function finishDrag(event: React.PointerEvent<HTMLButtonElement>) {
    const current = drag.current
    if (!current || current.pointerId !== event.pointerId) return
    event.preventDefault()
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    drag.current = null
    setDragging(null)
    setHovered(null)
    if (current.from !== current.to) reorderQueue(current.from, current.to)
  }

  function cancelDrag() {
    drag.current = null
    setDragging(null)
    setHovered(null)
  }

  return (
    <section className="sona-queue-screen" aria-label="Play queue">
      <div className="sona-queue-heading">
        <div><h2>Up Next</h2><p>Tap to play. Hold the handle to reorder.</p></div>
        <span>{currentList.length} tracks</span>
      </div>
      <div className="sona-queue-scroller">
        {currentList.map((song, index) => (
          <div
            className={'sona-queue-row ' + (index === currentSongIndex ? 'is-current ' : '') +
              (dragging === index ? 'is-dragged ' : '') + (hovered === index && dragging !== null ? 'is-target' : '')}
            data-sona-queue-index={index}
            key={song.id + ':' + index}
          >
            <button type="button" className="sona-queue-song" onClick={() => setSongList(currentList, index)} aria-label={'Play ' + song.title}>
              <span className="sona-queue-art">
                {song.coverArt ? (
                  <ImageLoader id={song.coverArt} type="song" size={100}>
                    {(src) => <img src={src} alt="" loading="lazy" />}
                  </ImageLoader>
                ) : <Music2 size={20} />}
              </span>
              <span className="sona-queue-text">
                <strong>{song.title}</strong>
                <small>{song.artist}</small>
              </span>
            </button>
            {index === currentSongIndex && <span className="sona-queue-current">Playing</span>}
            <button
              type="button" className="sona-queue-remove"
              aria-label={'Remove ' + song.title + ' from queue'}
              onClick={() => removeSongFromQueue(song.id)}
            ><X size={16} /></button>
            <button
              type="button" className="sona-queue-grip" aria-label={'Drag to reorder ' + song.title}
              onPointerDown={(event) => startDrag(event, index)}
              onPointerMove={moveDrag}
              onPointerUp={finishDrag}
              onPointerCancel={cancelDrag}
              onLostPointerCapture={cancelDrag}
            ><GripVertical size={22} /></button>
          </div>
        ))}
      </div>
    </section>
  )
}
