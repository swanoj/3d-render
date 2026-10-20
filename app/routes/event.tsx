import { data, Link } from 'react-router'
import type { Route } from './+types/event'
import { brand } from '../brand/brand'
import { Countdown } from '../components/Countdown'
import { EventArt } from '../components/EventCard'
import { Gallery } from '../components/Gallery'
import { Lineup, NextDrop } from '../components/Lineup'
import { OnNow, SetTimes } from '../components/NightOf'
import { VinylBadge } from '../components/NightRow'
import { Pending } from '../components/Pending'
import { RouteError } from '../components/RouteError'
import { Note } from '../components/Scribble'
import { ShareButton } from '../components/ShareButton'
import { TicketButton } from '../components/TicketButton'
import { getNight, getPhotos } from '../content/content.server'
import type { NightView } from '../content/types'
import { clockTime, posterDate } from '../lib/format'
import { useNow } from '../lib/hooks'
import { nightPhase, requestNow } from '../lib/nightOf'
import { eventPath } from '../lib/paths'
import { seo } from '../lib/seo'

export async function loader({ params, request }: Route.LoaderArgs) {
  const now = requestNow(request)
  const night = await getNight(params.slug, now)
  if (!night) throw data('Event not found', { status: 404 })
  const url = new URL(eventPath(night), request.url).href
  const photos = await getPhotos(night.slug)
  // A previewed "now" (?now=…) carries on into the clocks in the browser.
  return { night, url, now, offset: now - Date.now(), photos, mood: night.mood }
}

/** schema.org event data, so search engines can show the event with its date and venue. */
function eventJsonLd(night: NightView, url: string) {
  const { venue } = brand
  const confirmed = night.lineupConfirmed && night.lineup.length > 0
  return {
    '@context': 'https://schema.org',
    '@type': 'MusicEvent',
    name: `${brand.name}: ${posterDate(night.startsAt)}`,
    url,
    startDate: night.startsAt,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    typicalAgeRange: '18-',
    ...(night.artwork ? { image: new URL(night.artwork.src, url).href } : {}),
    location: {
      '@type': 'MusicVenue',
      name: `${venue.name} at the ${venue.host}`,
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
      title: posterDate(night.startsAt),
      description: `${night.title} at the ${brand.venue.host}, ${brand.venue.suburb}. ${clockTime(night.startsAt)} until ${night.closes}.${lineup}`,
    }),
    { 'script:ld+json': eventJsonLd(night, url) },
  ]
}

export function ErrorBoundary() {
  return <RouteError />
}

export default function EventPage({ loaderData }: Route.ComponentProps) {
  const { night, offset, photos } = loaderData
  const { venue } = brand
  // Ticks, so the page turns to "on now" at doors, and follows the sets, without a reload.
  const now = useNow(loaderData.now, { every: 15_000, offset })
  const phase = nightPhase(night.startsAt, now)
  const doors = Date.parse(night.startsAt)
  const vinyl = night.format === 'vinyl'
  const live = phase === 'live'

  return (
    <>
      <section className="event-hero" aria-labelledby="event-title">
        <Link to="/events" className="text-link back-link" viewTransition>
          ← All events
        </Link>
        <div className="event-hero-art">
          <EventArt artwork={night.artwork} sizes="(max-width: 860px) 92vw, 44vw" eager />
        </div>
        <div className="event-hero-text">
          <p className="label event-hero-title">
            {night.title}
            {vinyl && <VinylBadge />}
          </p>
          <h1 id="event-title" className="hand event-hero-date">
            <time dateTime={night.startsAt}>{posterDate(night.startsAt)}</time>
          </h1>
          <p className="label">
            {clockTime(night.startsAt)} – {night.closes} · {venue.host}, {venue.suburb}
          </p>
          {live && <OnNow sets={night.setTimes} now={now} />}
          {night.acts.length ? (
            <div className="event-hero-lineup">
              <Lineup acts={night.acts} />
              {night.nextDrop ? (
                <NextDrop drop={night.nextDrop} now={now} offset={offset} />
              ) : (
                !night.lineupConfirmed && (
                  <Note className="lineup-note" arrow="arrow" flip delay={500}>
                    more names soon
                  </Note>
                )
              )}
            </div>
          ) : (
            <p className="hand event-hero-soon">Line-up to be announced</p>
          )}
          <div className="button-row button-row--start event-actions">
            <TicketButton night={night} />
            <a className="button" href={`${eventPath(night)}/calendar.ics`} download>
              Add to calendar
            </a>
            <ShareButton
              title={`${brand.name}: ${posterDate(night.startsAt)}`}
              text={`${night.title} at the ${venue.host}, ${venue.suburb}.`}
            />
          </div>
          {night.status === 'announced' && (
            <p className="mono event-hero-list">
              Tickets go on sale soon.{' '}
              <a href="#list" className="text-link">
                Get on the list
              </a>{' '}
              to hear first.
            </p>
          )}
          {doors > now && (
            <p className="mono">
              Doors in <Countdown to={doors} now={now} offset={offset} />
            </p>
          )}
        </div>
      </section>

      <section className="surface surface--cream block" aria-labelledby="details-title">
        <h2 id="details-title" className="label block-label">
          The details
        </h2>
        <dl className="info-list">
          <div>
            <dt>Doors</dt>
            <dd>
              {clockTime(night.startsAt)} until {night.closes}
            </dd>
          </div>
          {vinyl && (
            <div>
              <dt>Music</dt>
              <dd>All vinyl, all night.</dd>
            </div>
          )}
          <div>
            <dt>Venue</dt>
            <dd>
              {venue.name}, at the {venue.host}. {venue.street}, {venue.locality}.{' '}
              <a href={venue.mapUrl} target="_blank" rel="noreferrer">
                Open in Google Maps ↗
              </a>
            </dd>
          </div>
          <div>
            <dt>Entry</dt>
            <dd>
              {brand.entry} <Pending>Entry price</Pending>
            </dd>
          </div>
          <div>
            <dt>Good to know</dt>
            <dd>
              Dress code, tickets, birthdays and booths.{' '}
              <Link to="/faqs" viewTransition>
                Read the FAQs →
              </Link>
            </dd>
          </div>
        </dl>
      </section>

      {night.setTimes.length > 0 && phase !== 'past' && (
        <section className="surface surface--charcoal block" aria-labelledby="sets-title">
          <div className="block-heading">
            <h2 id="sets-title" className="hand block-title">
              Set times
            </h2>
            {live && <span className="on-air">Live now</span>}
          </div>
          <SetTimes sets={night.setTimes} now={now} live={live} />
        </section>
      )}

      {photos.length > 0 && (
        <section id="photos" className="surface surface--charcoal block" aria-labelledby="photos-title">
          <div className="block-heading">
            <h2 id="photos-title" className="hand block-title">
              From the night
            </h2>
          </div>
          <Gallery photos={photos} date={night.startsAt} />
        </section>
      )}
    </>
  )
}
