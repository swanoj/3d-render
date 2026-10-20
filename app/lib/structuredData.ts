import { brand } from '../brand/brand'
import type { Artist, NightView } from '../content/types'
import { localIso, posterDate } from './format'
import { RUNNING_TIME } from './nightOf'
import { eventPath } from './paths'

/*
 * schema.org data for search engines and AI assistants. Every page describes Club Casa the same way: the organisation
 * (the club night), the Prince Bandroom (where it happens), the weekly Saturday series and each night in it, linked by
 * @id so the pieces join up into one picture.
 */

type Json = Record<string, unknown>

const ids = (origin: string) => ({
  organization: `${origin}/#organization`,
  website: `${origin}/#website`,
  series: `${origin}/#every-saturday`,
})

/** The Prince Bandroom, by its own name, so it matches the venue search engines already know. */
export function venueJsonLd(): Json {
  const { venue } = brand
  return {
    '@type': 'MusicVenue',
    name: venue.host,
    address: {
      '@type': 'PostalAddress',
      streetAddress: venue.street,
      addressLocality: venue.suburb,
      addressRegion: venue.state,
      postalCode: venue.postcode,
      addressCountry: venue.country,
    },
    hasMap: venue.mapUrl,
  }
}

export interface Contact {
  email: string | null
  instagram: string | null
}

/** Club Casa itself. The email and Instagram join in once they're confirmed (in the back office or brand.ts). */
export function organizationJsonLd(origin: string, contact: Contact = brand.contact): Json {
  return {
    '@type': 'Organization',
    '@id': ids(origin).organization,
    name: brand.name,
    url: `${origin}/`,
    logo: `${origin}/brand/official/primary-logo.png`,
    description: brand.description,
    slogan: brand.tagline,
    ...(contact.email ? { email: contact.email } : {}),
    ...(contact.instagram ? { sameAs: [`https://www.instagram.com/${contact.instagram.replace(/^@/, '')}/`] } : {}),
  }
}

/** The weekly night as a series: what an assistant needs to answer "what's on at Club Casa, and when?" */
export function seriesJsonLd(origin: string, nights: NightView[] = []): Json {
  return {
    '@type': 'EventSeries',
    '@id': ids(origin).series,
    name: brand.name,
    description: brand.description,
    url: `${origin}/events`,
    organizer: { '@id': ids(origin).organization },
    location: venueJsonLd(),
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    typicalAgeRange: '18-',
    eventSchedule: {
      '@type': 'Schedule',
      byDay: 'https://schema.org/Saturday',
      startTime: brand.hours.opens,
      endTime: brand.hours.closes,
      repeatFrequency: 'P1W',
      scheduleTimezone: brand.timeZone,
    },
    ...(nights.length
      ? {
          subEvent: nights.map((night) => ({
            '@type': 'MusicEvent',
            '@id': `${origin}${eventPath(night)}#event`,
            name: eventName(night),
            url: `${origin}${eventPath(night)}`,
            startDate: night.startsAt,
          })),
        }
      : {}),
  }
}

/** The home page: who the club is, the site, and the series. */
export function homeJsonLd(origin: string, contact?: Contact): Json {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      organizationJsonLd(origin, contact),
      {
        '@type': 'WebSite',
        '@id': ids(origin).website,
        name: brand.name,
        url: `${origin}/`,
        inLanguage: brand.locale,
        publisher: { '@id': ids(origin).organization },
      },
      seriesJsonLd(origin),
    ],
  }
}

/** The events page: the series with every coming night in it. */
export function eventsJsonLd(origin: string, nights: NightView[]): Json {
  return { '@context': 'https://schema.org', '@graph': [organizationJsonLd(origin), seriesJsonLd(origin, nights)] }
}

function eventName(night: NightView) {
  const date = posterDate(night.startsAt)
  return night.title === brand.name ? `${brand.name}: ${date}` : `${brand.name}: ${night.title}, ${date}`
}

/** One night, for Google's event results and for assistants answering "who's playing on Saturday?" */
export function eventJsonLd(night: NightView, origin: string, description: string): Json {
  const url = `${origin}${eventPath(night)}`
  const confirmed = night.lineupConfirmed && night.lineup.length > 0
  const performers = night.acts.flatMap((act) =>
    act.hidden
      ? []
      : [{ '@type': 'MusicGroup', name: act.name, ...(act.artist ? { url: `${origin}/artists/${act.artist}` } : {}) }],
  )
  return {
    '@context': 'https://schema.org',
    '@type': 'MusicEvent',
    '@id': `${url}#event`,
    name: eventName(night),
    description,
    url,
    startDate: night.startsAt,
    endDate: localIso(Date.parse(night.startsAt) + RUNNING_TIME),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    typicalAgeRange: '18-',
    ...(night.artwork ? { image: [new URL(night.artwork.src, origin).href] } : {}),
    location: venueJsonLd(),
    organizer: { '@type': 'Organization', '@id': ids(origin).organization, name: brand.name, url: `${origin}/` },
    superEvent: { '@id': ids(origin).series },
    ...(confirmed && performers.length ? { performer: performers } : {}),
    ...(night.ticketUrl
      ? {
          offers: {
            '@type': 'Offer',
            url: night.ticketUrl,
            availability: `https://schema.org/${night.status === 'sold-out' ? 'SoldOut' : 'InStock'}`,
            ...(night.priceFrom !== undefined ? { price: night.priceFrom, priceCurrency: 'AUD' } : {}),
          },
        }
      : {}),
  }
}

/** An act's page. MusicGroup covers solo DJs too ("can also be a solo musician", says schema.org). */
export function artistJsonLd(artist: Artist, origin: string): Json {
  const url = `${origin}/artists/${artist.slug}`
  return {
    '@context': 'https://schema.org',
    '@type': 'MusicGroup',
    '@id': `${url}#act`,
    name: artist.name,
    description: artist.bio,
    url,
    genre: 'House',
    ...(artist.photo ? { image: new URL(artist.photo, origin).href } : {}),
    ...(artist.links?.length ? { sameAs: artist.links.map((link) => link.url) } : {}),
  }
}

/** The trail above a page in search results: Club Casa › Events › Saturday 24th Oct. */
export function breadcrumbJsonLd(origin: string, trail: { name: string; path: string }[]): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [{ name: brand.name, path: '/' }, ...trail].map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: `${origin}${crumb.path}`,
    })),
  }
}
