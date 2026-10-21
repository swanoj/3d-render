import type { SanityClient } from 'sanity'
import { comingSaturdays, melbourneDay, melbourneInstant } from './melbourne'

/*
 * Every Saturday is a Club Casa night. The site lists the coming eight whether or not they're in the back office
 * ("Club Casa", line-up to be announced, each wearing one of the weekly posters in turn), so the back office keeps the
 * same eight in Coming up, ready to open and fill in. The seed script adds them, and so does opening the Studio. Doors,
 * close and the posters come from Every Saturday, the same as on the site.
 */

/** How many Saturdays ahead the site lists (WEEKS_AHEAD in app/content/content.server.ts). */
export const WEEKS_AHEAD = 8
const WEEK = 7 * 24 * 60 * 60 * 1000

/** The site's own doors and close (app/content/site.ts), until Every Saturday has its own. */
export const DOORS = '22:00'
export const CLOSES = '05:00'

/** One of the weekly posters from Every Saturday. */
export interface Poster {
  _key?: string
  asset?: { _ref: string }
  hotspot?: unknown
  crop?: unknown
  alt?: string
}

/** Every Saturday, as the Studio reads it. */
export interface Weekly {
  posters?: Poster[] | null
  doors?: string | null
  closes?: string | null
}

/** A 24-hour time ("22:00") as the posters write it: "10PM", or "9:30PM". The same as clock() in app/content/site.ts. */
export function clock(time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  return `${hours % 12 || 12}${minutes ? `:${String(minutes).padStart(2, '0')}` : ''}${hours < 12 ? 'AM' : 'PM'}`
}

/** Half-hourly times from one to another, past midnight if need be, as dropdown choices: { title: "10PM", value: "22:00" }. */
export function timeOptions(from: string, to: string) {
  const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3))
  const span = (minutes(to) - minutes(from) + 24 * 60) % (24 * 60)
  return Array.from({ length: span / 30 + 1 }, (_, step) => {
    const at = (minutes(from) + step * 30) % (24 * 60)
    const value = `${String(Math.floor(at / 60)).padStart(2, '0')}:${String(at % 60).padStart(2, '0')}`
    return { title: clock(value), value }
  })
}

/** The weekly poster a Saturday wears: they take turns week by week, the same way as on the site. */
export function weeklyPoster(day: string, posters: Poster[]) {
  const usable = posters.filter((poster) => poster.asset?._ref)
  if (!usable.length) return undefined
  return usable[Math.round(Date.parse(`${day}T00:00:00Z`) / WEEK) % usable.length]
}

/** A Saturday as the site shows it before anything's announced: doors to close, tickets soon, the weekly poster. */
export function saturdayNight(day: string, weekly: Weekly | null) {
  const poster = weeklyPoster(day, weekly?.posters ?? [])
  return {
    _id: `night-${day}`,
    _type: 'night',
    startsAt: melbourneInstant(day, weekly?.doors || DOORS),
    slug: { _type: 'slug', current: day },
    title: 'Club Casa',
    closes: clock(weekly?.closes || CLOSES),
    mood: 'charcoal',
    vinyl: false,
    status: 'announced',
    lineupConfirmed: false,
    ...(poster?.asset
      ? {
          poster: {
            _type: 'image',
            asset: { _type: 'reference', _ref: poster.asset._ref },
            ...(poster.hotspot ? { hotspot: poster.hotspot } : {}),
            ...(poster.crop ? { crop: poster.crop } : {}),
            ...(poster.alt ? { alt: poster.alt } : {}),
          },
        }
      : {}),
  }
}

/**
 * Adds the coming Saturdays that aren't in the back office yet, published, since the site shows them already, and
 * returns how many it added. A Saturday that has a night of any kind (published, a draft, or under another address)
 * is left alone, so the team's work is never touched.
 */
export async function addComingSaturdays(client: SanityClient, now = Date.now()) {
  const days = comingSaturdays(WEEKS_AHEAD, now)
  const { weekly, nights } = await client.fetch<{ weekly: Weekly | null; nights: { slug?: string; startsAt?: string }[] }>(
    `{
      "weekly": *[_id == "weekly"][0]{ posters, doors, closes },
      "nights": *[_type == "night" && (slug.current in $days || dateTime(startsAt) >= dateTime($from))]{ "slug": slug.current, startsAt }
    }`,
    { days, from: melbourneInstant(days[0], '00:00') },
    { perspective: 'raw' },
  )
  const taken = new Set(nights.flatMap((night) => [night.slug, melbourneDay(night.startsAt)]))
  const missing = days.filter((day) => !taken.has(day))
  if (!missing.length) return 0
  const transaction = client.transaction()
  for (const day of missing) transaction.createIfNotExists(saturdayNight(day, weekly))
  await transaction.commit()
  return missing.length
}
