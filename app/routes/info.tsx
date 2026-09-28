import { brand } from '../brand/brand'
import { Mark } from '../components/Mark'
import type { RouteHandle } from '../lib/mood'
import { seo } from '../lib/seo'

export const handle: RouteHandle = { mood: 'cream' }

export function meta() {
  return seo({ title: 'Info', description: `Where to find Club Casa, entry and tickets.` })
}

export default function Info() {
  const { venue } = brand
  return (
    <>
      <header className="page-header">
        <p className="label">Club Casa</p>
        <h1 className="hand page-title">Info</h1>
      </header>

      <section className="surface surface--cream block" aria-labelledby="info-title">
        <h2 id="info-title" className="visually-hidden">
          Visiting Club Casa
        </h2>
        <dl className="info-list">
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
            <dt>Tickets</dt>
            <dd>Each night links to its tickets when they go on sale. Get on the list to hear first.</dd>
          </div>
        </dl>
        <Mark name="logo-circled" className="info-lockup" />
      </section>
    </>
  )
}
