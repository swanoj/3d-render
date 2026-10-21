import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import type { Route } from './+types/home-v2'
import { brand } from '../brand/brand'
import { ClubDoor } from '../club/ClubDoor'
import { ClubLayer } from '../club/ClubLayer'
import { Crate } from '../components/Crate'
import { FilmStrip } from '../components/FilmStrip'
import { Mark } from '../components/Mark'
import { OnNow } from '../components/NightOf'
import { PlanArt, type PlanKind } from '../components/PlanArt'
import { Note, Scribble } from '../components/Scribble'
import { StampedTitle } from '../components/ScrollFx'
import { WalkInButton, WalkMeter } from '../components/WalkIn'
import { getHouse, getNights, getPage } from '../content/content.server'
import type { Plan } from '../content/pages'
import { useNow } from '../lib/hooks'
import { nightRecord } from '../lib/nightRecord'
import { useWalkIn, type Stage } from '../lib/walkIn'
import { useHeroParallax, useScrollReveal } from '../lib/scrollFx'
import { nightPhase, requestNow } from '../lib/nightOf'
import { seo, siteCopy } from '../lib/seo'
import { useCopy } from '../lib/useSite'

/*
 * The home page, version two: the same page, with the walk in (the sound opens up as you scroll in from the street,
 * see WalkIn) and the crate of Saturdays in place of the events grid (see Crate). It lives at /v2 beside the home
 * page to compare, kept out of search results.
 */

export function meta({ matches }: Route.MetaArgs) {
  return [...seo(siteCopy(matches)), { name: 'robots', content: 'noindex' }]
}

export async function loader({ request }: Route.LoaderArgs) {
  const now = requestNow(request)
  const [{ upcoming }, house, page] = await Promise.all([getNights(now), getHouse(), getPage('home')])
  // A previewed "now" (?now=…) carries on into the clocks in the browser.
  return { upcoming, now, offset: now - Date.now(), photos: house.photos, plans: page.plans, mood: brand.defaultMood }
}

/** Ways to plan a night, each with its own page and its own little show on hover. Their words are the home page's. */
const PLANS: { kind: PlanKind; to: string; title: string }[] = [
  { kind: 'tickets', to: '/tickets', title: 'Tickets' },
  { kind: 'birthdays', to: '/birthdays', title: 'Birthdays' },
  { kind: 'booths', to: '/booths', title: 'Booths' },
]

/** A way to plan the night: its show plays while the card is hovered or focused (or as it scrolls in, on touch). */
function PlanCard({ plan, words }: { plan: (typeof PLANS)[number]; words: Plan }) {
  const [active, setActive] = useState(false)
  return (
    <Link
      to={plan.to}
      className="plan-card"
      viewTransition
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
    >
      <PlanArt kind={plan.kind} active={active} autoplay className="plan-card-art" />
      <span className="hand plan-title">{plan.title}</span>
      <span className="mono plan-text">{words.text}</span>
      <span className="plan-action">{words.action} →</span>
    </Link>
  )
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { upcoming, offset, photos, plans } = loaderData
  const copy = useCopy()
  const { venue, hours } = copy
  // Ticks, so the page turns to "on now" at doors, and follows the sets, without a reload.
  const now = useNow(loaderData.now, { every: 15_000, offset })
  const [next] = upcoming
  const live = next ? nightPhase(next.startsAt, now) === 'live' : false
  const hero = useRef<HTMLElement>(null)
  const page = useRef<HTMLDivElement>(null)
  useHeroParallax(hero)
  useScrollReveal(page, '.event-feature, .event-card, .plan-card, .about-art, .venue-lockup')
  const stage = useWalkIn(page)
  // Stepping inside puts the next night's record on, the one at the front of the crate.
  const record = useMemo(() => (next ? nightRecord(next, 0) : null), [next])
  const stages: Stage[] = ['street', 'door', 'inside', 'bar', ...(photos.length ? (['floor'] as const) : []), 'out']

  return (
    <div ref={page} className="home home-v2">
      <section ref={hero} className="hero" data-walk="street" aria-labelledby="hero-title">
        <h1 id="hero-title" className="hero-logo">
          <Mark name="logo-tilted" label={brand.name} className="boil" />
        </h1>
        <p className="hand hero-tagline">{copy.tagline}</p>
        <p className="label hero-hours">
          {hours.days} · {hours.time} · {venue.host}, {venue.suburb}
        </p>
        {live && next && <OnNow sets={next.setTimes} now={now} />}
        <div className="button-row hero-actions">
          <Link to="/tickets" className="button button--solid" viewTransition>
            Get tickets
          </Link>
          <a href="#events" className="button">
            Upcoming events
          </a>
        </div>
        <WalkInButton record={record} stage={stage} />
        <Mark name="emblem" className="hero-emblem spin-steps" />
        {/* Hover down here. */}
        <ClubDoor hero={hero} />
      </section>

      <Crate nights={upcoming} now={now} offset={offset} />

      <section className="surface surface--cream about" data-walk="inside" aria-labelledby="about-title">
        <div className="about-art">
          <Mark name="logo-stacked" className="about-logo" />
          <Mark name="squiggle" className="about-squiggle" />
        </div>
        <div className="about-copy">
          <h2 id="about-title" className="label">
            About {brand.name}
          </h2>
          <p className="hand about-lede">{copy.tagline}</p>
          <p className="mono">{copy.about}</p>
          <p className="hand about-hours">
            <span className="circled">
              {hours.days}
              <Scribble kind="circle" className="circled-ring" stretch delay={300} />
            </span>{' '}
            {hours.time}
          </p>
        </div>
      </section>

      <section className="surface surface--charcoal block plans" data-walk="bar" aria-labelledby="plans-title">
        <div className="block-heading">
          <StampedTitle id="plans-title" className="hand block-title">
            Plan your night
          </StampedTitle>
        </div>
        <ul className="plan-grid">
          {PLANS.map((plan) => (
            <li key={plan.to}>
              <PlanCard plan={plan} words={plans[plan.kind]} />
            </li>
          ))}
        </ul>
        <p className="plans-more mono">
          <span>Questions?</span>
          <Link to="/faqs" className="text-link" viewTransition>
            FAQs
          </Link>
          <span>· Want to work with us?</span>
          <Link to="/careers" className="text-link" viewTransition>
            Join the team
          </Link>
          <Note className="plans-note" arrow="arrow" flip delay={500}>
            promoters & hosts
          </Note>
        </p>
      </section>

      {photos.length > 0 && (
        <div data-walk="floor">
          <FilmStrip photos={photos} />
        </div>
      )}

      <section className="surface surface--cream venue" data-walk="out" aria-labelledby="venue-title">
        <Mark name="logo-mascot" className="venue-lockup" />
        <div className="venue-text">
          <p className="label">Find us</p>
          <h2 id="venue-title" className="hand venue-name">
            {venue.host}
          </h2>
          <address className="mono">
            {venue.name}
            <br />
            {venue.street}
            <br />
            {venue.locality}
          </address>
          <p className="mono">
            {hours.long}. {copy.entry}
          </p>
          <div className="button-row button-row--start">
            <a className="button button--solid" href={venue.mapUrl} target="_blank" rel="noreferrer">
              Open in Google Maps ↗
            </a>
            <Link to="/contact" className="button" viewTransition>
              Contact
            </Link>
          </div>
        </div>
      </section>
      <ClubLayer />
      <WalkMeter stage={stage} stages={stages} record={record} page={page} />
    </div>
  )
}
