import { useEffect, useRef, useState } from 'react'
import type { Photo } from '../content/types'
import { pad2 } from '../lib/format'

/** The date a disposable camera burns into the corner: "16 10 '26". */
function burnedDate(iso: string) {
  const [year, month, day] = iso.slice(0, 10).split('-')
  return `${day} ${month} '${year.slice(2)}`
}

/**
 * A night's photos as prints from a disposable camera: warm, grainy, the date burned into the corner. Tap one to
 * see it large; the arrow keys move through them.
 */
export function Gallery({ photos, date }: { photos: Photo[]; date: string }) {
  const [open, setOpen] = useState<number | null>(null)
  const stamp = burnedDate(date)
  return (
    <>
      <ul className="gallery">
        {photos.map((photo, i) => (
          <li key={photo.src}>
            <button type="button" className="print" onClick={() => setOpen(i)} aria-label={`${photo.alt}, photo ${i + 1}`}>
              <img src={photo.src} alt="" loading="lazy" decoding="async" />
              <span className="print-date" aria-hidden>
                {stamp}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <Lightbox photos={photos} index={open} stamp={stamp} onChange={setOpen} />
    </>
  )
}

interface LightboxProps {
  photos: Photo[]
  /** The photo showing, or null when closed. */
  index: number | null
  stamp: string
  onChange: (index: number | null) => void
}

function Lightbox({ photos, index, stamp, onChange }: LightboxProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const count = photos.length

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (index !== null && !element.open) element.showModal()
    if (index === null && element.open) element.close()
  }, [index])

  const step = (by: number) => {
    if (index !== null) onChange((index + by + count) % count)
  }
  const photo = index === null ? null : photos[index]

  return (
    <dialog
      ref={dialog}
      className="lightbox"
      aria-label="Photo"
      onClose={() => onChange(null)}
      onClick={(event) => {
        if (event.target === event.currentTarget) onChange(null)
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight') step(1)
        if (event.key === 'ArrowLeft') step(-1)
      }}
    >
      {photo && index !== null && (
        <figure className="lightbox-figure">
          <div className="print print--large">
            <img src={photo.src} alt={photo.alt} />
            <span className="print-date" aria-hidden>
              {stamp}
            </span>
          </div>
          <figcaption className="mono lightbox-caption">
            {pad2(index + 1)} / {pad2(count)}
          </figcaption>
        </figure>
      )}
      <div className="lightbox-controls">
        {count > 1 && (
          <button type="button" className="pill" onClick={() => step(-1)} aria-label="Previous photo">
            ←
          </button>
        )}
        <button type="button" className="pill" onClick={() => onChange(null)}>
          Close
        </button>
        {count > 1 && (
          <button type="button" className="pill" onClick={() => step(1)} aria-label="Next photo">
            →
          </button>
        )}
      </div>
    </dialog>
  )
}
