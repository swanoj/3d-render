import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import type { NightView, ShownAct } from '../content/types'
import { posterDate } from '../lib/format'
import { Countdown } from './Countdown'
import { Note } from './Scribble'

// Indents (in em) that reproduce the loose, hand-set stagger of the poster line-ups.
const INDENTS = [0, 2.6, 0.5, 3.5, 1.3, 0, 2.1, 0, 2.8, 5.4, 0.7, 1.8, 0.2, 3.1]
// How long each redacted bar runs, so the hidden names don't all look the same length.
const BARS = ['9.5ch', '7ch', '11ch', '6ch', '8.5ch']

interface LineupProps {
  acts: ShownAct[]
  align?: 'start' | 'center'
}

/**
 * A line-up set like the posters: one act per line, each nudged a different distance from the margin. Acts with
 * a page link to it; acts still to be revealed are blacked out with marker.
 */
export function Lineup({ acts, align = 'start' }: LineupProps) {
  return (
    <ul className={`lineup lineup--${align}`}>
      {acts.map((act, i) => {
        const style = { '--indent': `${INDENTS[i % INDENTS.length]}em` } as CSSProperties
        if (act.hidden) {
          const bar = BARS[acts.slice(0, i).filter((earlier) => earlier.hidden).length % BARS.length]
          return (
            <li key={`hidden-${i}`} style={style} className="lineup-hidden">
              <span className="redacted" style={{ '--bar': bar } as CSSProperties} />
              <span className="visually-hidden">To be announced</span>
            </li>
          )
        }
        return (
          <li key={`${act.name}-${i}`} style={style}>
            {act.artist ? (
              <Link to={`/artists/${act.artist}`} className="lineup-link" viewTransition>
                {act.name}
              </Link>
            ) : (
              act.name
            )}
          </li>
        )
      })}
    </ul>
  )
}

/** The next reveal: "phase 2 drops Fri 2 Oct", counting down. */
export function NextDrop({
  drop,
  now,
  offset = 0,
}: {
  drop: NonNullable<NightView['nextDrop']>
  now: number
  offset?: number
}) {
  return (
    <div className="next-drop">
      <Note className="next-drop-note" arrow="arrow" flip delay={500}>
        {drop.count === 1 ? 'one more name' : `${drop.count} more names`}
      </Note>
      <p className="mono next-drop-when">
        Revealed {posterDate(drop.at)} · <Countdown to={Date.parse(drop.at)} now={now} offset={offset} />
      </p>
    </div>
  )
}
