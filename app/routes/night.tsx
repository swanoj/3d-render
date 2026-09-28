import { data, Link } from 'react-router'
import type { Route } from './+types/night'
import { brand } from '../brand/brand'
import { Countdown } from '../components/Countdown'
import { Lineup } from '../components/Lineup'
import { Mark } from '../components/Mark'
import { VinylBadge } from '../components/NightRow'
import { RouteError } from '../components/RouteError'
import { Motif, Note } from '../components/Scribble'
import { ShareButton } from '../components/ShareButton'
import { TicketButton } from '../components/TicketButton'
import { getNight } from '../content/content.server'
import type { Night } from '../content/types'
import { clockTime, posterDate } from '../lib/format'
import { seo } from '../lib/seo'

export async function loader({ params, request }: Route.LoaderArgs) {
  const night = await getNight(params.slug)
  if (!night) throw data('Night not found', { status: 404 })
  const url = new URL(`/nights/${night.slug}`, request.url).href
  return { night, url, now: Date.now(), mood: night.mood }
}

/** schema.org event data, so search engines can show the night with its date and venue. */
function eventJsonLd(night: Night, url: string) {
  const { venue } = brand
  const confirmed = night.lineupConfirmed && night.lineup.length > 0
  return {
    '@context': 'https://schema.org',
    '@type': 'MusicEvent',
    name: `${brand.name}: ${night.title}`,
    url,
    startDate: night.startsAt,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    typicalAgeRange: '18-',
    location: {
      '@type': 'MusicVenue',
      name: venue.name,
      address: {
        '@type': 'PostalAddress',
        streetAddress: venue.street,
        addressLocality: venue.suburb,
        addressRegion: venue.state,
        postalCode: venue.postcode,
        addressCountry: venue.country,
      },
    },
    organizer: { '@type': 'Organization', name: brand.name },
    ...(confirmed ? { performer: night.lineup.map((name) => ({ '@type': 'Person', name })) } : {}),
    ...(night.ticketUrl
      ? {
          offers: {
            '@type': 'Offer',
            url: night.ticketUrl,
            availability: `https://schema.org/${night.status === 'sold-out' ? 'SoldOut' : 'InStock'}`,
          },
        }
      : {}),
  }
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return seo({ title: 'Not found' })
  const { night, url } = loaderData
  const lineup = night.lineupConfirmed && night.lineup.length ? ` With ${night.lineup.join(', ')}.` : ''
  return [
    ...seo({
      title: `${posterDate(night.startsAt)}`,
      description: `${night.title} at the ${brand.venue.name}, St Kilda. ${clockTime(night.startsAt)} until ${night.closes.toLowerCase()}.${lineup}`,
    }),
    { 'script:ld+json': eventJsonLd(night, url) },
  ]
}

export function ErrorBoundary() {
  return <RouteError />
}

export default function NightPage({ loaderData }: Route.ComponentProps) {
  const { night, now } = loaderData
  const { venue } = brand
  const doors = Date.parse(night.startsAt)
  const vinyl = night.format === 'vinyl'

  return (
    <>
      <section className="night-hero" aria-labelledby="night-title">
        <Link to="/nights" className="text-link back-link" viewTransition>
          ← All nights
        </Link>
        <Motif name={night.motif} className="night-hero-motif" delay={300} />
        <p className="label night-hero-title">
          {night.title}
          {vinyl && <VinylBadge />}
        </p>
        <h1 id="night-title" className="hand night-hero-date">
          <time dateTime={night.startsAt}>{posterDate(night.startsAt)}</time>
        </h1>
        <p className="label">
          {clockTime(night.startsAt)}–{night.closes} · {venue.name}, St Kilda
        </p>
        {night.lineup.length ? (
          <div className="night-hero-lineup">
            <Lineup names={night.lineup} />
            {!night.lineupConfirmed && (
              <Note className="lineup-note" arrow="arrow" flip delay={500}>
                more names soon
              </Note>
            )}
          </div>
        ) : (
          <p className="hand night-hero-soon">Line-up soon</p>
        )}
        <Mark name="submark" className="hero-submark" />
        <div className="button-row night-actions">
          <TicketButton night={night} />
          <a className="button" href={`/nights/${night.slug}/calendar.ics`} download>
            Add to calendar
          </a>
          <ShareButton title={`${brand.name}: ${posterDate(night.startsAt)}`} text={`${night.title} at the ${venue.name}, St Kilda.`} />
          <Note className="calendar-note" arrow="arrow" flip delay={700}>
            pop it in the diary
          </Note>
        </div>
        {doors > now && (
          <p className="mono">
            Doors in <Countdown to={doors} now={now} />
          </p>
        )}
      </section>

      <section className="surface surface--cream block" aria-labelledby="details-title">
        <h2 id="details-title" className="label block-label">
          The details
        </h2>
        <dl className="info-list">
          <div>
            <dt>Doors</dt>
            <dd>
              {clockTime(night.startsAt)} until {night.closes.toLowerCase()}
            </dd>
          </div>
          {vinyl && (
            <div>
              <dt>Music</dt>
              <dd>All vinyl, all night. Once a month the room plays records only.</dd>
            </div>
          )}
          <div>
            <dt>Venue</dt>
            <dd>
              {venue.name}, {venue.note.toLowerCase()}. {venue.street}, {venue.locality}.{' '}
              <a href={venue.mapUrl} target="_blank" rel="noreferrer">
                Open in Maps ↗
              </a>
            </dd>
          </div>
          <div>
            <dt>Entry</dt>
            <dd>{brand.entry}</dd>
          </div>
          <div>
            <dt>House rules</dt>
            <dd>
              Be kind, dance first and film later.{' '}
              <Link to="/info#house-rules" viewTransition>
                Read them all →
              </Link>
            </dd>
          </div>
        </dl>
      </section>
    </>
  )
}
