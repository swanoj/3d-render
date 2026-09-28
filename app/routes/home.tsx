import { Link } from 'react-router'
import type { Route } from './+types/home'
import { brand } from '../brand/brand'
import { CasaTV } from '../components/CasaTV'
import { Countdown } from '../components/Countdown'
import { FilmStrip } from '../components/FilmStrip'
import { Lineup, NextDrop } from '../components/Lineup'
import { Mark } from '../components/Mark'
import { NightRow } from '../components/NightRow'
import { OnNow } from '../components/NightOf'
import { Note } from '../components/Scribble'
import { TicketButton } from '../components/TicketButton'
import { getHouse, getNights } from '../content/content.server'
import { clockTime, posterDate } from '../lib/format'
import { useNow } from '../lib/hooks'
import { nightPhase, requestNow } from '../lib/nightOf'
import { seo } from '../lib/seo'
import type { TvData } from '../three/channels'

export function meta() {
  return seo()
}

export async function loader({ request }: Route.LoaderArgs) {
  const now = requestNow(request)
  const [{ upcoming }, house] = await Promise.all([getNights(now), getHouse()])
  const next = upcoming[0] ?? null
  const vinylNext = upcoming.find((night) => night.format === 'vinyl') ?? null
  const tv: TvData = {
    next: next && {
      title: next.title,
      startsAt: next.startsAt,
      closes: next.closes,
      acts: next.acts.map((act) => (act.hidden ? null : act.name)),
      sets: next.setTimes.map(({ start, name }) => ({ start, name })),
    },
    vinylNext: vinylNext && { startsAt: vinylNext.startsAt },
    rules: house.houseRules,
    venue: `${brand.venue.name} · St Kilda`,
    now,
    // A previewed "now" (?now=…) carries on into the clocks in the browser.
    offset: now - Date.now(),
  }
  return { next, upcoming, now, tv, photos: house.photos, mood: next?.mood ?? brand.defaultMood }
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { next, upcoming, tv, photos } = loaderData
  const { venue } = brand
  // Ticks, so the page turns to "on now" at doors, and follows the sets, without a reload.
  const now = useNow(loaderData.now, { every: 15_000, offset: tv.offset })
  const live = next ? nightPhase(next.startsAt, now) === 'live' : false

  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <h1 id="hero-title" className="hero-logo">
          <Mark name="logo" label={brand.name} />
        </h1>
        {next ? (
          <div className="hero-night">
            <p className="label">{next.title}</p>
            <p className="hand hero-date">
              <time dateTime={next.startsAt}>{live ? 'Tonight' : posterDate(next.startsAt)}</time>
              <Note className="hero-note" arrow="arrow" flip delay={900}>
                {live ? 'come on down' : 'save the date'}
              </Note>
            </p>
            <p className="label hero-time">
              {clockTime(next.startsAt)}–{next.closes} · {venue.name}, St Kilda
            </p>
            <Mark name="submark" className="hero-submark" />
            <div className="button-row">
              <TicketButton night={next} />
              <Link to={`/nights/${next.slug}`} className="button" viewTransition>
                Line-up
              </Link>
            </div>
            {live ? (
              <OnNow sets={next.setTimes} now={now} />
            ) : (
              <p className="mono hero-countdown">
                Doors in <Countdown to={Date.parse(next.startsAt)} now={now} offset={tv.offset} />
              </p>
            )}
          </div>
        ) : (
          <p className="hand hero-date">New nights soon</p>
        )}
      </section>

      <CasaTV data={tv} />

      <section className="surface surface--cream intro" aria-labelledby="intro-title">
        <div className="intro-poster">
          <h2 id="intro-title" className="visually-hidden">
            {next ? `${next.title} line-up` : 'About Club Casa'}
          </h2>
          <Mark name="logo-stacked" className="intro-logo" />
          <Mark name="squiggle" className="intro-squiggle" />
          {next?.acts.length ? (
            <div className="intro-lineup">
              <Lineup acts={next.acts} />
              {next.nextDrop ? (
                <NextDrop drop={next.nextDrop} now={now} offset={tv.offset} />
              ) : (
                !next.lineupConfirmed && (
                  <Note className="lineup-note" arrow="arrow" flip delay={400}>
                    more names soon
                  </Note>
                )
              )}
            </div>
          ) : (
            <p className="label">Line-up soon</p>
          )}
        </div>
        <div className="intro-copy">
          <p className="mono">{brand.intro}</p>
          <Mark name="underline" className="intro-underline" />
        </div>
      </section>

      <section className="surface surface--charcoal block" aria-labelledby="nights-title">
        <div className="block-heading">
          <h2 id="nights-title" className="hand block-title">
            Nights
          </h2>
          <Link to="/nights" className="text-link" viewTransition>
            All nights →
          </Link>
        </div>
        {upcoming.length ? (
          <ul className="night-list">
            {upcoming.map((night) => (
              <NightRow key={night.slug} night={night} />
            ))}
          </ul>
        ) : (
          <p className="mono">New nights soon. Get on the list to hear first.</p>
        )}
      </section>

      <FilmStrip photos={photos} />

      <section className="surface surface--cream venue" aria-labelledby="venue-title">
        <Mark name="logo-circled" className="venue-lockup" />
        <div className="venue-text">
          <p className="label">Find us</p>
          <h2 id="venue-title" className="hand venue-name">
            {venue.name}
          </h2>
          <address className="mono">
            {venue.note}
            <br />
            {venue.street}
            <br />
            {venue.locality}
          </address>
          <p className="mono">{brand.entry}</p>
          <a className="button button--solid" href={venue.mapUrl} target="_blank" rel="noreferrer">
            Open in Maps
          </a>
        </div>
      </section>
    </>
  )
}
