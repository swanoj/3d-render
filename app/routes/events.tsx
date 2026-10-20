import type { Route } from './+types/events'
import { brand } from '../brand/brand'
import { EventCard } from '../components/EventCard'
import { NightRow } from '../components/NightRow'
import { PageHero } from '../components/PageHero'
import { getNights } from '../content/content.server'
import { requestNow } from '../lib/nightOf'
import { seo } from '../lib/seo'
import { siteOrigin } from '../lib/site.server'
import { eventsJsonLd } from '../lib/structuredData'

export function meta({ loaderData }: Route.MetaArgs) {
  return [
    ...seo({
      title: 'Events',
      description: `Upcoming events at ${brand.name}: ${brand.hours.long}, at the ${brand.venue.host}, ${brand.venue.suburb}.`,
    }),
    ...(loaderData ? [{ 'script:ld+json': eventsJsonLd(loaderData.origin, loaderData.upcoming) }] : []),
  ]
}

export async function loader({ request }: Route.LoaderArgs) {
  return { ...(await getNights(requestNow(request))), origin: siteOrigin(request) }
}

export default function Events({ loaderData }: Route.ComponentProps) {
  const { upcoming, past } = loaderData
  return (
    <>
      <PageHero
        label={`${brand.hours.days} · ${brand.hours.time}`}
        title="Events"
        intro={`Every Saturday night at the ${brand.venue.host}, ${brand.venue.suburb}. Line-ups go up here as they’re announced, with tickets for each night.`}
        mark="logo-stacked-stroke"
      />

      <section className="surface surface--charcoal block" aria-labelledby="upcoming-title">
        <h2 id="upcoming-title" className="label block-label">
          Coming up
        </h2>
        {upcoming.length ? (
          <div className="event-grid">
            {upcoming.map((night) => (
              <EventCard key={night.slug} night={night} />
            ))}
          </div>
        ) : (
          <p className="mono">New events soon. Get on the list to hear first.</p>
        )}

        {past.length > 0 && (
          <>
            <h2 className="label block-label block-label--spaced">Past events</h2>
            <ul className="night-list night-list--past">
              {past.map((night) => (
                <NightRow key={night.slug} night={night} />
              ))}
            </ul>
          </>
        )}
      </section>
    </>
  )
}
