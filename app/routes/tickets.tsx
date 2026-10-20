import { Link } from 'react-router'
import type { Route } from './+types/tickets'
import { brand } from '../brand/brand'
import { Mark } from '../components/Mark'
import { Pending } from '../components/Pending'
import { PageHero } from '../components/PageHero'
import { TicketButton } from '../components/TicketButton'
import { getNights } from '../content/content.server'
import { clockTime, dateParts, posterDate } from '../lib/format'
import { requestNow } from '../lib/nightOf'
import { eventPath } from '../lib/paths'
import { seo } from '../lib/seo'

export function meta() {
  return seo({
    title: 'Tickets',
    description: `Tickets for ${brand.name}: ${brand.hours.long}, at the ${brand.venue.host}, ${brand.venue.suburb}.`,
  })
}

export async function loader({ request }: Route.LoaderArgs) {
  const { upcoming } = await getNights(requestNow(request))
  return { upcoming }
}

export default function Tickets({ loaderData }: Route.ComponentProps) {
  const { upcoming } = loaderData
  const onSale = upcoming.some((night) => night.status === 'on-sale' && night.ticketUrl)
  return (
    <>
      <PageHero
        label={`${brand.hours.days} · ${brand.hours.time}`}
        title="Tickets"
        intro="Tickets for every Club Casa night are sold online. Pick your Saturday below: each one opens for tickets when it goes on sale."
        mark="emblem"
      />

      <section className="surface surface--charcoal block" aria-labelledby="ticket-dates-title">
        <div className="block-heading">
          <h2 id="ticket-dates-title" className="label">
            Choose a date
          </h2>
          {!onSale && <p className="mono ticket-soon">Tickets aren’t on sale yet. Get on the list to hear first.</p>}
        </div>
        <ul className="ticket-list">
          {upcoming.map((night) => {
            const date = dateParts(night.startsAt)
            return (
              <li key={night.slug} className="ticket-row">
                <time dateTime={night.startsAt} className="ticket-date">
                  <span className="hand ticket-day">{date.day}</span>
                  <span className="ticket-month">
                    {date.weekday} {date.month}
                  </span>
                </time>
                <div className="ticket-text">
                  <Link to={eventPath(night)} className="ticket-title" viewTransition>
                    {posterDate(night.startsAt)}
                  </Link>
                  <p className="mono">
                    {night.title} · {clockTime(night.startsAt)} – {night.closes} · {brand.venue.host}
                  </p>
                  <p className="mono ticket-lineup">
                    {night.lineup.length ? night.lineup.join(' • ') : 'Line-up to be announced'}
                  </p>
                </div>
                <div className="ticket-actions">
                  <TicketButton night={night} className="button--small" />
                  <Link to={eventPath(night)} className="button button--small" viewTransition>
                    View event
                  </Link>
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="surface surface--cream block" aria-labelledby="ticket-info-title">
        <h2 id="ticket-info-title" className="label block-label">
          Good to know
        </h2>
        <dl className="info-list">
          <div>
            <dt>Where to buy</dt>
            <dd>
              Online, from each event’s Get tickets button. <Pending>Ticketing partner</Pending>
            </dd>
          </div>
          <div>
            <dt>Price</dt>
            <dd>
              <Pending>Entry prices, shown with each event’s tickets</Pending>
            </dd>
          </div>
          <div>
            <dt>Entry</dt>
            <dd>{brand.entry}</dd>
          </div>
          <div>
            <dt>Groups</dt>
            <dd>
              Coming for a birthday, or want a booth for the night?{' '}
              <Link to="/birthdays" viewTransition>
                Birthdays →
              </Link>{' '}
              <Link to="/booths" viewTransition>
                Booths →
              </Link>
            </dd>
          </div>
          <div>
            <dt>Questions</dt>
            <dd>
              <Link to="/faqs" viewTransition>
                Read the FAQs →
              </Link>
            </dd>
          </div>
        </dl>
        <Mark name="logo-emblem" className="info-lockup" />
      </section>
    </>
  )
}
