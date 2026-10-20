import { brand } from '../brand/brand'
import { dateParts, posterDate } from '../lib/format'
import { RUNNING_TIME } from '../lib/nightOf'
import { artists } from './artists'
import { weeklyArtwork } from './artwork'
import { faq, gettingThere } from './faq'
import { houseRules, room } from './house'
import { nights } from './nights'
import { photosFor } from './photos'
import { mixes } from './radio'
import type { Act, Night, NightView, ShownAct } from './types'

/*
 * The content API route loaders call. It reads the typed files in this folder today; moving the schedule into a
 * CMS (the reference build uses Sanity) means replacing these bodies with queries and keeping the return types.
 */

/**
 * A night with its reveal phases applied at `now`: an act whose phase hasn't dropped comes back as a redacted
 * entry, and its name never reaches the page. Reveals follow the real clock: a previewed time (`?now=…`) can show
 * a name as still under wraps, but never reveal one early.
 */
function viewNight(night: Night, now: number): NightView {
  const revealedBy = Math.min(now, Date.now())
  const dropAt = (act: Act) => (act.phase && act.phase > 1 ? night.phases?.find((p) => p.phase === act.phase)?.at : undefined)
  const hidden = (act: Act) => {
    const at = dropAt(act)
    return at !== undefined && Date.parse(at) > revealedBy
  }
  const acts: ShownAct[] = night.lineup.map((act) =>
    hidden(act)
      ? { hidden: true, phase: act.phase ?? 2, at: dropAt(act) ?? '' }
      : { hidden: false, name: act.name, artist: act.artist },
  )
  const drops = acts.flatMap((act) => (act.hidden ? [act.at] : [])).sort((a, b) => Date.parse(a) - Date.parse(b))
  const setTimes = (night.setTimes ?? []).map((set) => {
    const act = night.lineup.find((candidate) => candidate.name === set.act)
    const secret = act ? hidden(act) : false
    return { start: set.start, name: secret ? null : set.act, artist: secret ? undefined : act?.artist }
  })
  const { lineup, phases: _phases, setTimes: _sets, ...rest } = night
  return {
    ...rest,
    lineup: lineup.filter((act) => !hidden(act)).map((act) => act.name),
    acts,
    nextDrop: drops.length ? { at: drops[0], count: drops.filter((at) => at === drops[0]).length } : null,
    setTimes,
  }
}

/** How many Saturdays ahead the weekly rule fills in. */
const WEEKS_AHEAD = 8
const DAY = 24 * 60 * 60 * 1000

/** "+11:00" or "+10:00": Melbourne's offset from UTC at an instant. */
function melbourneOffset(at: number) {
  const name = new Intl.DateTimeFormat('en-AU', { timeZone: brand.timeZone, timeZoneName: 'longOffset' })
    .formatToParts(new Date(at))
    .find((part) => part.type === 'timeZoneName')?.value
  return name?.replace('GMT', '') || '+10:00'
}

/** The date in Melbourne at an instant, as "2026-10-24", and its weekday (0 is Sunday). */
function melbourneDate(at: number) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: brand.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).formatToParts(new Date(at))
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'))
  return { date: `${get('year')}-${get('month')}-${get('day')}`, weekday }
}

/**
 * Every Saturday from the one in progress (or the next) for WEEKS_AHEAD weeks, as placeholders: the brand's hours,
 * no line-up, tickets soon, and the brand's posts in turn as artwork.
 */
function weeklyNights(now: number): Night[] {
  // From a day back, so a Saturday night still running into Sunday morning is included.
  const { date, weekday } = melbourneDate(now - DAY)
  const daysToSaturday = (6 - weekday + 7) % 7
  const first = Date.parse(`${date}T12:00:00Z`) + daysToSaturday * DAY
  return Array.from({ length: WEEKS_AHEAD }, (_, week) => {
    const slug = new Date(first + week * 7 * DAY).toISOString().slice(0, 10)
    const doors = Date.parse(`${slug}T22:00:00+10:00`)
    const weekNumber = Math.round(Date.parse(`${slug}T00:00:00Z`) / (7 * DAY))
    return {
      slug,
      title: brand.name,
      startsAt: `${slug}T${brand.hours.opens}:00${melbourneOffset(doors)}`,
      closes: '5AM',
      mood: 'charcoal',
      artwork: weeklyArtwork[weekNumber % weeklyArtwork.length],
      lineup: [],
      status: 'announced',
      placeholder: true,
    }
  })
}

/** The calendar: the weekly placeholders, with any night announced in nights.ts in place of its Saturday. */
function calendar(now: number) {
  const announced = new Map(nights.map((night) => [night.slug, night]))
  const weekly = weeklyNights(now).map((placeholder) => {
    const night = announced.get(placeholder.slug)
    announced.delete(placeholder.slug)
    return night ? { ...night, artwork: night.artwork ?? placeholder.artwork } : placeholder
  })
  return [...weekly, ...announced.values()].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
}

export async function getNights(now = Date.now()) {
  const sorted = calendar(now)
  const upcoming = sorted.filter((night) => Date.parse(night.startsAt) + RUNNING_TIME > now)
  // The archive is for nights that were announced; an empty placeholder Saturday isn't worth listing.
  const past = sorted.filter((night) => !night.placeholder && Date.parse(night.startsAt) + RUNNING_TIME <= now).reverse()
  return { upcoming: upcoming.map((night) => viewNight(night, now)), past: past.map((night) => viewNight(night, now)) }
}

/** The coming Saturdays, for the booking forms' date field: "Saturday 24th Oct 2026". */
export async function getSaturdays(now = Date.now()): Promise<[string, string][]> {
  const { upcoming } = await getNights(now)
  return upcoming
    .filter((night) => dateParts(night.startsAt).weekday === 'Sat')
    .map((night) => {
      const label = `${posterDate(night.startsAt)} ${dateParts(night.startsAt).year}`
      return [label, label]
    })
}

export async function getNight(slug: string, now = Date.now()) {
  const night = calendar(now).find((candidate) => candidate.slug === slug)
  return night ? viewNight(night, now) : null
}

export async function getArtist(slug: string, now = Date.now()) {
  const artist = artists.find((candidate) => candidate.slug === slug)
  if (!artist) return null
  // The nights they play that have announced them.
  const { upcoming } = await getNights(now)
  const playing = upcoming.filter((night) => night.acts.some((act) => !act.hidden && act.artist === slug))
  const mix = artist.mix ? (mixes.find((candidate) => candidate.id === artist.mix) ?? null) : null
  return { artist, playing, mix }
}

export async function getHouse() {
  return { houseRules, room, photos: photosFor() }
}

export async function getPhotos(nightSlug: string) {
  return photosFor(nightSlug)
}

export async function getGuide() {
  return { faq, gettingThere }
}
