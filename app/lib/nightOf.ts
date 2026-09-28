/** A night counts as on from doors until 8 hours later. */
export const RUNNING_TIME = 8 * 60 * 60 * 1000

export type NightPhase = 'upcoming' | 'live' | 'past'

export function nightPhase(startsAt: string, now: number): NightPhase {
  const doors = Date.parse(startsAt)
  if (now < doors) return 'upcoming'
  return now < doors + RUNNING_TIME ? 'live' : 'past'
}

/** Who's playing and who's next, from a night's set times (in running order). */
export function onNow<Set extends { start: string }>(
  setTimes: Set[],
  now: number,
): { current: Set | null; next: Set | null } {
  let current: Set | null = null
  for (const set of setTimes) {
    if (Date.parse(set.start) > now) return { current, next: set }
    current = set
  }
  return { current, next: null }
}

/**
 * The time a page renders "now": the real time, or `?now=` in the address to preview a moment, e.g.
 * `/?now=2026-10-16T23:30:00%2B11:00` for night-of mode. (An unencoded "+" arrives as a space, so that's allowed.)
 */
export function requestNow(request: Request) {
  const value = new URL(request.url).searchParams.get('now')
  const at = value ? Date.parse(value.replace(' ', '+')) : Number.NaN
  return Number.isFinite(at) ? at : Date.now()
}
