import type { CSSProperties } from 'react'
import type { Route } from './+types/info'
import { brand } from '../brand/brand'
import { Mark } from '../components/Mark'
import { Motif, Scribble } from '../components/Scribble'
import { getGuide, getHouse } from '../content/content.server'
import type { RouteHandle } from '../lib/mood'
import { seo } from '../lib/seo'

export const handle: RouteHandle = { mood: 'cream' }

export function meta({ loaderData }: Route.MetaArgs) {
  return [
    ...seo({
      title: 'Info',
      description: 'Where to find Club Casa, getting there, entry, tickets, the house rules and answers to common questions.',
    }),
    ...(loaderData ? [{ 'script:ld+json': faqJsonLd(loaderData.faq) }] : []),
  ]
}

export async function loader() {
  const [{ houseRules, room }, { faq, gettingThere }] = await Promise.all([getHouse(), getGuide()])
  return { houseRules, room, faq, gettingThere }
}

/** schema.org FAQ data, so search engines can answer questions about the night directly. */
function faqJsonLd(faq: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  }
}

// Each rule sits a little crooked, as if written on the card by hand.
const TILTS = [-1.2, 0.8, -0.4, 1.1, -0.9, 0.5]

export default function Info({ loaderData }: Route.ComponentProps) {
  const { houseRules, room, faq, gettingThere } = loaderData
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

        <h2 id="getting-there" className="label block-label block-label--spaced">
          Getting there
        </h2>
        <dl className="info-list">
          {gettingThere.map((way) => (
            <div key={way.label}>
              <dt>{way.label}</dt>
              <dd>{way.text}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section id="house-rules" className="surface surface--orange house" aria-labelledby="rules-title">
        <div className="house-card">
          <span className="house-tape" aria-hidden />
          <h2 id="rules-title" className="hand house-title">
            House rules
          </h2>
          <Scribble kind="underline" className="house-underline" />
          <ol className="house-rules">
            {houseRules.map((rule, i) => (
              <li key={rule} style={{ '--tilt': `${TILTS[i % TILTS.length]}deg` } as CSSProperties}>
                <Mark name="check" className="house-check" />
                <span className="hand">{rule}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="surface surface--charcoal room" aria-labelledby="room-title">
        <div className="room-text">
          <p className="label">Upstairs at the Prince</p>
          <h2 id="room-title" className="hand room-title">
            {room.heading}
          </h2>
          <ul className="room-lines">
            {room.lines.map((line) => (
              <li key={line} className="mono">
                {line}
              </li>
            ))}
          </ul>
          <p className="hand room-vinyl">
            {room.vinyl.lead}{' '}
            <span className="circled">
              {room.vinyl.circled}
              <Scribble kind="circle" className="circled-ring" stretch delay={400} />
            </span>
          </p>
        </div>
        <div className="room-doodles" aria-hidden>
          <Motif name="lamp" className="room-doodle room-doodle--lamp" />
          <Motif name="tv" className="room-doodle room-doodle--tv" delay={250} />
          <Motif name="plant" className="room-doodle room-doodle--plant" delay={500} />
          <Motif name="record" className="room-doodle room-doodle--record" delay={750} />
          <Motif name="mirror" className="room-doodle room-doodle--mirror" delay={1000} />
          <Motif name="star" className="room-doodle room-doodle--star" delay={1250} />
        </div>
      </section>

      <section id="faq" className="surface surface--cream block" aria-labelledby="faq-title">
        <div className="block-heading">
          <h2 id="faq-title" className="hand block-title">
            Good to know
          </h2>
        </div>
        <div className="faq">
          {faq.map(({ question, answer }) => (
            <details key={question}>
              <summary>{question}</summary>
              <p className="mono">{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="surface surface--cream block info-foot" aria-label="Club Casa">
        <Mark name="logo-circled" className="info-lockup" />
      </section>
    </>
  )
}
