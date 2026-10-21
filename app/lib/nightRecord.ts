import type { GrooveId, Mix, NightView } from '../content/types'
import { posterDate } from './format'

/** The grooves the crate's records take in turn; the all-vinyl nights get the Sunday groove. */
const GROOVES: GrooveId[] = ['house', 'deep', 'disco', 'sunday']

/**
 * A night as a record for Casa Radio, for the crate on the v2 home page: its date across the label, its line-up
 * under it, and a groove to play while you decide.
 */
export function nightRecord(night: NightView, i: number): Mix {
  return {
    id: `night-${night.slug}`,
    title: posterDate(night.startsAt),
    artist: night.lineup.length ? night.lineup.join(', ') : 'Line-up to be announced',
    groove: night.format === 'vinyl' ? 'sunday' : GROOVES[i % GROOVES.length],
    sleeve: night.mood,
    label: 'CLUB CASA',
  }
}
