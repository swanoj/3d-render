import type { CSSProperties } from 'react'
import type { Photo } from '../content/types'
import { Note } from './Scribble'

/** Light leaks for the frames that haven't come back from the lab: lamp glow, a red room, a plant in shadow. */
const UNDEVELOPED = [
  { x: '24%', y: '30%', leak: '#ff8a3d' },
  { x: '62%', y: '58%', leak: '#c2405e' },
  { x: '38%', y: '70%', leak: '#ffb067' },
  { x: '76%', y: '26%', leak: '#e0452c' },
  { x: '30%', y: '46%', leak: '#7d8a55' },
  { x: '58%', y: '40%', leak: '#f3d2a6' },
]

/**
 * Photos from past nights as a strip of negatives, from the concept deck: "faded, grainy imagery, no obvious
 * faces, keeping the people and the night mysterious". Until the first night has happened, the frames are still
 * developing.
 */
export function FilmStrip({ photos }: { photos: Photo[] }) {
  const developed = photos.length > 0
  const frames = developed ? photos : UNDEVELOPED

  const track = (hidden: boolean) => (
    <ul className="film-track" aria-hidden={hidden || undefined}>
      {frames.map((frame, i) => (
        <li key={'src' in frame ? frame.src : frame.leak} className="film-frame">
          <span className="film-edge" aria-hidden>
            CASA 400 ▸ {i * 2 + 12}A
          </span>
          {'src' in frame ? (
            <img src={frame.src} alt={hidden ? '' : frame.alt} loading="lazy" decoding="async" />
          ) : (
            <span
              className="film-blank"
              style={{ '--x': frame.x, '--y': frame.y, '--leak': frame.leak, '--i': i } as CSSProperties}
            />
          )}
        </li>
      ))}
    </ul>
  )

  return (
    <section className="film" aria-labelledby="film-title">
      <div className="film-heading">
        <p className="label">From the room</p>
        <div className="film-title-row">
          <h2 id="film-title" className="hand film-title">
            {developed ? 'Last time' : 'Developing'}
          </h2>
          {!developed && (
            <Note className="film-note" arrow="arrow" flip>
              no faces, promise
            </Note>
          )}
        </div>
        <p className="mono film-copy">
          {developed
            ? 'Faded, grainy and no faces. What happens at Casa stays a little mysterious.'
            : 'Photos from each night land here once the film is back from the lab.'}
        </p>
      </div>
      <div className="film-window">
        <div className="film-reel">
          {track(false)}
          {track(true)}
        </div>
      </div>
    </section>
  )
}
