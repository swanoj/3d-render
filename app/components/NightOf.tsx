import { Link } from 'react-router'
import type { NightView } from '../content/types'
import { clockTime } from '../lib/format'
import { onNow } from '../lib/nightOf'

type Sets = NightView['setTimes']

/** The night's running order. On the night, the set that's playing is marked "on now". */
export function SetTimes({ sets, now, live }: { sets: Sets; now: number; live: boolean }) {
  const { current } = live ? onNow(sets, now) : { current: null }
  return (
    <ol className="set-times">
      {sets.map((set) => {
        const playing = set === current
        return (
          <li key={set.start} className="set-time" data-playing={playing || undefined}>
            <time className="mono set-time-at" dateTime={set.start}>
              {clockTime(set.start)}
            </time>
            <span className="set-time-act">
              {set.name === null ? (
                <>
                  <span className="redacted" />
                  <span className="visually-hidden">To be announced</span>
                </>
              ) : set.artist ? (
                <Link to={`/artists/${set.artist}`} viewTransition>
                  {set.name}
                </Link>
              ) : (
                set.name
              )}
            </span>
            {playing && <span className="on-air">On now</span>}
          </li>
        )
      })}
    </ol>
  )
}

/** "On now: Casa residents · Next: Special guest, 12AM" while a night is on. */
export function OnNow({ sets, now }: { sets: Sets; now: number }) {
  const { current, next } = onNow(sets, now)
  return (
    <p className="on-now">
      <span className="on-air">Doors open</span>
      {current && (
        <span className="mono">
          On now: <strong>{current.name ?? 'a special guest'}</strong>
        </span>
      )}
      {next && (
        <span className="mono">
          Next: {next.name ?? 'to be revealed'}, {clockTime(next.start)}
        </span>
      )}
    </p>
  )
}
