import { data, Link } from 'react-router'
import type { Route } from './+types/night'
import { brand } from '../brand/brand'
import { Countdown } from '../components/Countdown'
import { Lineup } from '../components/Lineup'
import { Mark } from '../components/Mark'
import { RouteError } from '../components/RouteError'
import { TicketButton } from '../components/TicketButton'
import { getNight } from '../content/content.server'
import { clockTime, posterDate } from '../lib/format'
import { seo } from '../lib/seo'

export async function loader({ params }: Route.LoaderArgs) {
  const night = await getNight(params.slug)
  if (!night) throw data('Night not found', { status: 404 })
  return { night, now: Date.now(), mood: night.mood }
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return seo({ title: 'Not found' })
  const { night } = loaderData
  const lineup = night.lineup.length ? ` With ${night.lineup.join(', ')}.` : ''
  return seo({
    title: `${posterDate(night.startsAt)}`,
    description: `${night.title} at the ${brand.venue.name}, St Kilda. ${clockTime(night.startsAt)} until ${night.closes.toLowerCase()}.${lineup}`,
  })
}

export function ErrorBoundary() {
  return <RouteError />
}

export default function NightPage({ loaderData }: Route.ComponentProps) {
  const { night, now } = loaderData
  const { venue } = brand
  const doors = Date.parse(night.startsAt)

  return (
    <>
      <section className="night-hero" aria-labelledby="night-title">
        <Link to="/nights" className="text-link back-link" viewTransition>
          ← All nights
        </Link>
        <p className="label">{night.title}</p>
        <h1 id="night-title" className="hand night-hero-date">
          <time dateTime={night.startsAt}>{posterDate(night.startsAt)}</time>
        </h1>
        <p className="label">
          {clockTime(night.startsAt)}–{night.closes}
        </p>
        {night.lineup.length ? (
          <Lineup names={night.lineup} />
        ) : (
          <p className="hand night-hero-soon">Line-up soon</p>
        )}
        <Mark name="submark" className="hero-submark" />
        <div className="button-row">
          <TicketButton night={night} />
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
        </dl>
      </section>
    </>
  )
}
