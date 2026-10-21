import type { Route } from './+types/events'
import { brand } from '../brand/brand'
import { EventCard } from '../components/EventCard'
import { NightRow } from '../components/NightRow'
import { PageHero } from '../components/PageHero'
import { getNights, getPage } from '../content/content.server'
import { requestNow } from '../lib/nightOf'
import { seo, siteCopy } from '../lib/seo'
import { useCopy } from '../lib/useSite'
import { siteOrigin } from '../lib/site.server'
import { eventsJsonLd } from '../lib/structuredData'

export function meta({ loaderData, matches }: Route.MetaArgs) {
  const copy = siteCopy(matches)
  return [
    ...seo(copy, {
      title: 'Events',
      description: `Upcoming events at ${brand.name}: ${copy.hours.long}, at the ${copy.venue.host}, ${copy.venue.suburb}.`,
    }),
    ...(loaderData ? [{ 'script:ld+json': eventsJsonLd(loaderData.origin, copy, loaderData.upcoming) }] : []),
  ]
}

export async function loader({ request }: Route.LoaderArgs) {
  const [nights, page] = await Promise.all([getNights(requestNow(request)), getPage('events')])
  return { ...nights, page, origin: siteOrigin(request) }
}

export default function Events({ loaderData }: Route.ComponentProps) {
  const { upcoming, past, page } = loaderData
  const { hours } = useCopy()
  return (
    <>
      <PageHero
        label={`${hours.days} · ${hours.time}`}
        title="Events"
        intro={page.intro}
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
