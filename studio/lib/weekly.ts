import type { SanityClient } from 'sanity'
import { comingSaturdays, melbourneDay, melbourneInstant } from './melbourne'

/*
 * Every Saturday is a Club Casa night. The site lists the coming eight whether or not they're in the back office
 * ("Club Casa", line-up to be announced, each wearing one of the weekly posters in turn), so the back office keeps the
 * same eight in Coming up, ready to open and fill in. The seed script adds them, and so does opening the Studio.
 */

/** How many Saturdays ahead the site lists (WEEKS_AHEAD in app/content/content.server.ts). */
export const WEEKS_AHEAD = 8
const WEEK = 7 * 24 * 60 * 60 * 1000

/** One of the weekly posters from Every Saturday. */
export interface Poster {
  _key?: string
  asset?: { _ref: string }
  hotspot?: unknown
  crop?: unknown
  alt?: string
}

/** The weekly poster a Saturday wears: they take turns week by week, the same way as on the site. */
export function weeklyPoster(day: string, posters: Poster[]) {
  const usable = posters.filter((poster) => poster.asset?._ref)
  if (!usable.length) return undefined
  return usable[Math.round(Date.parse(`${day}T00:00:00Z`) / WEEK) % usable.length]
}

/** A Saturday as the site shows it before anything's announced: doors at 10PM until 5AM, tickets soon. */
export function saturdayNight(day: string, posters: Poster[]) {
  const poster = weeklyPoster(day, posters)
  return {
    _id: `night-${day}`,
    _type: 'night',
    startsAt: melbourneInstant(day, '22:00'),
    slug: { _type: 'slug', current: day },
    title: 'Club Casa',
    closes: '5AM',
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
  const { posters, nights } = await client.fetch<{ posters: Poster[] | null; nights: { slug?: string; startsAt?: string }[] }>(
    `{
      "posters": *[_id == "weekly"][0].posters,
      "nights": *[_type == "night" && (slug.current in $days || dateTime(startsAt) >= dateTime($from))]{ "slug": slug.current, startsAt }
    }`,
    { days, from: melbourneInstant(days[0], '00:00') },
    { perspective: 'raw' },
  )
  const taken = new Set(nights.flatMap((night) => [night.slug, melbourneDay(night.startsAt)]))
  const missing = days.filter((day) => !taken.has(day))
  if (!missing.length) return 0
  const transaction = client.transaction()
  for (const day of missing) transaction.createIfNotExists(saturdayNight(day, posters ?? []))
  await transaction.commit()
  return missing.length
}
