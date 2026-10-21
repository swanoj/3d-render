/*
 * Melbourne dates for the back office, matching the site (app/lib/format.ts): nights are set in Melbourne time
 * whatever time zone the editor is in.
 */

const ZONE = 'Australia/Melbourne'
const DAY = 24 * 60 * 60 * 1000
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function parts(at: number, options: Intl.DateTimeFormatOptions) {
  const list = new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, ...options }).formatToParts(new Date(at))
  return (type: string) => list.find((part) => part.type === type)?.value ?? ''
}

/** "+11:00" or "+10:00": Melbourne's offset from UTC at an instant. */
function offsetAt(at: number) {
  return parts(at, { timeZoneName: 'longOffset' })('timeZoneName').replace('GMT', '') || '+10:00'
}

/** The day in Melbourne at an instant, as "2026-10-24": a night's address on the site. */
export function melbourneDay(iso: string | undefined) {
  if (!iso || Number.isNaN(Date.parse(iso))) return ''
  const get = parts(Date.parse(iso), { year: 'numeric', month: '2-digit', day: '2-digit' })
  return `${get('year')}-${get('month')}-${get('day')}`
}

/** A Melbourne date and time ("2026-10-24", "22:00") as an instant. */
export function melbourneInstant(day: string, time: string) {
  const guess = Date.parse(`${day}T${time}:00+10:00`)
  return new Date(`${day}T${time}:00${offsetAt(guess)}`).toISOString()
}

/** Doors for a new night: this Saturday at 10PM in Melbourne, or next Saturday's once tonight's doors have opened. */
export function nextSaturdayDoors(now = Date.now()) {
  const get = parts(now, { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', hourCycle: 'h23' })
  const weekday = WEEKDAYS.indexOf(get('weekday'))
  let days = (6 - weekday + 7) % 7
  if (days === 0 && Number(get('hour')) >= 22) days = 7
  const today = `${get('year')}-${get('month')}-${get('day')}`
  const saturday = new Date(Date.parse(`${today}T12:00:00Z`) + days * DAY).toISOString().slice(0, 10)
  return melbourneInstant(saturday, '22:00')
}

/** The coming Saturdays as their dates ("2026-10-24"), from the one in progress: the Saturdays the site lists. */
export function comingSaturdays(weeks: number, now = Date.now()) {
  // From a day back, so a Saturday night still running into Sunday morning counts, as it does on the site.
  const get = parts(now - DAY, { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' })
  const daysToSaturday = (6 - WEEKDAYS.indexOf(get('weekday')) + 7) % 7
  const first = Date.parse(`${get('year')}-${get('month')}-${get('day')}T12:00:00Z`) + daysToSaturday * DAY
  return Array.from({ length: weeks }, (_, week) => new Date(first + week * 7 * DAY).toISOString().slice(0, 10))
}

function ordinal(day: number) {
  const suffixes = ['th', 'st', 'nd', 'rd']
  const lastTwo = day % 100
  return suffixes[(lastTwo - 20) % 10] ?? suffixes[lastTwo] ?? suffixes[0]
}

/** "Saturday 24th Oct", as the posters set it. */
export function posterDate(iso: string | undefined) {
  if (!iso || Number.isNaN(Date.parse(iso))) return 'New night'
  const get = parts(Date.parse(iso), { weekday: 'long', day: 'numeric', month: 'short' })
  const day = Number(get('day'))
  return `${get('weekday')} ${day}${ordinal(day)} ${get('month')}`
}
