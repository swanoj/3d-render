import { useRef, useState } from 'react'
import { Link } from 'react-router'
import type { Route } from './+types/home'
import { brand } from '../brand/brand'
import { ClubDoor } from '../club/ClubDoor'
import { ClubLayer } from '../club/ClubLayer'
import { EventCard, EventFeature } from '../components/EventCard'
import { FilmStrip } from '../components/FilmStrip'
import { Mark } from '../components/Mark'
import { OnNow } from '../components/NightOf'
import { PlanArt, type PlanKind } from '../components/PlanArt'
import { Note, Scribble } from '../components/Scribble'
import { StampedTitle } from '../components/ScrollFx'
import { getHouse, getNights } from '../content/content.server'
import { useNow } from '../lib/hooks'
import { useHeroParallax, useScrollReveal } from '../lib/scrollFx'
import { nightPhase, requestNow } from '../lib/nightOf'
import { seo } from '../lib/seo'

export function meta() {
  return seo()
}

export async function loader({ request }: Route.LoaderArgs) {
  const now = requestNow(request)
  const [{ upcoming }, house] = await Promise.all([getNights(now), getHouse()])
  // A previewed "now" (?now=…) carries on into the clocks in the browser.
  return { upcoming, now, offset: now - Date.now(), photos: house.photos, mood: brand.defaultMood }
}

/** Ways to plan a night, each with its own page and its own little show on hover. */
const PLANS: { kind: PlanKind; to: string; title: string; text: string; action: string }[] = [
  {
    kind: 'tickets',
    to: '/tickets',
    title: 'Tickets',
    text: 'Entry for every Saturday, online.',
    action: 'Get tickets',
  },
  {
    kind: 'birthdays',
    to: '/birthdays',
    title: 'Birthdays',
    text: 'Celebrating? Tell us about the night you have in mind.',
    action: 'Plan a birthday',
  },
  {
    kind: 'booths',
    to: '/booths',
    title: 'Booths',
    text: 'A booth for you and your friends, for the whole night.',
    action: 'Book a booth',
  },
]

/** A way to plan the night: its show plays while the card is hovered or focused (or as it scrolls in, on touch). */
function PlanCard({ plan }: { plan: (typeof PLANS)[number] }) {
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
      <span className="mono plan-text">{plan.text}</span>
      <span className="plan-action">{plan.action} →</span>
    </Link>
  )
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { upcoming, offset, photos } = loaderData
  const { venue, hours } = brand
  // Ticks, so the page turns to "on now" at doors, and follows the sets, without a reload.
  const now = useNow(loaderData.now, { every: 15_000, offset })
  const [next, ...later] = upcoming
  const live = next ? nightPhase(next.startsAt, now) === 'live' : false
  const hero = useRef<HTMLElement>(null)
  const page = useRef<HTMLDivElement>(null)
  useHeroParallax(hero)
  useScrollReveal(page, '.event-feature, .event-card, .plan-card, .about-art, .venue-lockup')

  return (
    <div ref={page} className="home">
      <section ref={hero} className="hero" aria-labelledby="hero-title">
        <h1 id="hero-title" className="hero-logo">
          <Mark name="logo-tilted" label={brand.name} className="boil" />
        </h1>
        <p className="hand hero-tagline">{brand.tagline}</p>
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
        <Mark name="emblem" className="hero-emblem spin-steps" />
        {/* Hover down here. */}
        <ClubDoor hero={hero} />
      </section>

      <section id="events" className="surface surface--charcoal block events-block" aria-labelledby="events-title">
        <div className="block-heading">
          <StampedTitle
            id="events-title"
            className="hand block-title"
            extra={<Scribble kind="underline" className="block-title-underline" />}
          >
            Upcoming events
          </StampedTitle>
          <Link to="/events" className="text-link" viewTransition>
            All events →
          </Link>
        </div>
        {next ? (
          <>
            <EventFeature night={next} now={now} offset={offset} />
            {later.length > 0 && (
              <div className="event-grid">
                {later.slice(0, 3).map((night) => (
                  <EventCard key={night.slug} night={night} />
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="mono">New events soon. Get on the list to hear first.</p>
        )}
      </section>

      <section className="surface surface--cream about" aria-labelledby="about-title">
        <div className="about-art">
          <Mark name="logo-stacked" className="about-logo" />
          <Mark name="squiggle" className="about-squiggle" />
        </div>
        <div className="about-copy">
          <h2 id="about-title" className="label">
            About {brand.name}
          </h2>
          <p className="hand about-lede">{brand.tagline}</p>
          <p className="mono">{brand.intro}</p>
          <p className="hand about-hours">
            <span className="circled">
              {hours.days}
              <Scribble kind="circle" className="circled-ring" stretch delay={300} />
            </span>{' '}
            {hours.time}
          </p>
        </div>
      </section>

      <section className="surface surface--charcoal block plans" aria-labelledby="plans-title">
        <div className="block-heading">
          <StampedTitle id="plans-title" className="hand block-title">
            Plan your night
          </StampedTitle>
        </div>
        <ul className="plan-grid">
          {PLANS.map((plan) => (
            <li key={plan.to}>
              <PlanCard plan={plan} />
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

      {photos.length > 0 && <FilmStrip photos={photos} />}

      <section className="surface surface--cream venue" aria-labelledby="venue-title">
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
            {hours.long}. {brand.entry}
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
    </div>
  )
}
