import { brand } from '../brand/brand'

// Every formatter pins the locale and Melbourne time zone, so the server and the visitor's browser render the
// same date whatever time zone either is in.

function format(iso: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(brand.locale, { ...options, timeZone: brand.timeZone }).format(new Date(iso))
}

function ordinal(day: number) {
  const suffixes = ['th', 'st', 'nd', 'rd']
  const lastTwo = day % 100
  return suffixes[(lastTwo - 20) % 10] ?? suffixes[lastTwo] ?? suffixes[0]
}

/** "Friday 16th Oct", as the posters set it. */
export function posterDate(iso: string) {
  const day = Number(format(iso, { day: 'numeric' }))
  return `${format(iso, { weekday: 'long' })} ${day}${ordinal(day)} ${format(iso, { month: 'short' })}`
}

/** "Fri", "16", "Oct" for date blocks in lists. */
export function dateParts(iso: string) {
  return {
    weekday: format(iso, { weekday: 'short' }),
    day: format(iso, { day: '2-digit' }),
    month: format(iso, { month: 'short' }),
    year: format(iso, { year: 'numeric' }),
  }
}

/** "10PM", "9:30PM". */
export function clockTime(iso: string) {
  const [hour, minute] = format(iso, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .split(':')
    .map(Number)
  const twelve = hour % 12 || 12
  return `${twelve}${minute ? `:${String(minute).padStart(2, '0')}` : ''}${hour < 12 ? 'AM' : 'PM'}`
}

export function pad2(value: number) {
  return String(value).padStart(2, '0')
}
