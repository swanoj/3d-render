import type { Route } from './+types/nights'
import { brand } from '../brand/brand'
import { NightRow } from '../components/NightRow'
import { getNights } from '../content/content.server'
import type { RouteHandle } from '../lib/mood'
import { seo } from '../lib/seo'

export const handle: RouteHandle = { mood: 'charcoal' }

export function meta() {
  return seo({ title: 'Nights', description: `Every Club Casa night at the ${brand.venue.name}, St Kilda.` })
}

export async function loader() {
  return getNights()
}

export default function Nights({ loaderData }: Route.ComponentProps) {
  const { upcoming, past } = loaderData
  return (
    <>
      <header className="page-header">
        <p className="label">
          {brand.venue.name} · St Kilda
        </p>
        <h1 className="hand page-title">Nights</h1>
      </header>

      <section className="surface surface--charcoal block" aria-labelledby="upcoming-title">
        <h2 id="upcoming-title" className="label block-label">
          Coming up
        </h2>
        {upcoming.length ? (
          <ul className="night-list">
            {upcoming.map((night) => (
              <NightRow key={night.slug} night={night} />
            ))}
          </ul>
        ) : (
          <p className="mono">New nights soon. Get on the list to hear first.</p>
        )}

        {past.length > 0 && (
          <>
            <h2 className="label block-label block-label--spaced">Archive</h2>
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
