import { Link } from 'react-router'
import { useCopy } from '../lib/useSite'
import type { Artwork, NightView } from '../content/types'
import { clockTime, dateParts, posterDate } from '../lib/format'
import { eventPath } from '../lib/paths'
import { Countdown } from './Countdown'
import { Lineup } from './Lineup'
import { Mark } from './Mark'
import { Note } from './Scribble'
import { TicketButton } from './TicketButton'

/** "Raresh • Rhadoo + 2 more", "Line-up to be announced". */
function lineupPreview(night: NightView, max = 4) {
  const hidden = night.acts.filter((act) => act.hidden).length
  if (!night.lineup.length) return hidden ? 'Line-up to be revealed' : 'Line-up to be announced'
  const more = night.lineup.length - max
  return `${night.lineup.slice(0, max).join(' • ')}${more > 0 ? ` + ${more} more` : ''}${hidden ? ' + more soon' : ''}`
}

/** An event's poster at 4:5, or the brand's charcoal stand-in if it has none. */
export function EventArt({ artwork, sizes, eager }: { artwork?: Artwork; sizes: string; eager?: boolean }) {
  if (!artwork) {
    return (
      <span className="event-art event-art--blank">
        <Mark name="logo-stacked-stroke" className="event-art-logo" />
      </span>
    )
  }
  return (
    <img
      className="event-art"
      src={artwork.small ?? artwork.src}
      srcSet={artwork.small ? `${artwork.small} 540w, ${artwork.src} 1080w` : undefined}
      sizes={sizes}
      width={1080}
      height={1350}
      alt={artwork.alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
    />
  )
}

/** One event in a grid: the poster, the date and the two things you'd want to do next. */
export function EventCard({ night }: { night: NightView }) {
  const { venue } = useCopy()
  const date = dateParts(night.startsAt)
  const href = eventPath(night)
  return (
    <article className="event-card">
      <Link to={href} className="event-card-art" tabIndex={-1} aria-hidden viewTransition>
        <EventArt artwork={night.artwork} sizes="(max-width: 700px) 92vw, (max-width: 1100px) 46vw, 30vw" />
        <span className="event-card-chip">
          {date.weekday} {date.day} {date.month}
        </span>
      </Link>
      <div className="event-card-body">
        <p className="label event-card-kicker">{night.title}</p>
        <h3 className="hand event-card-date">
          <Link to={href} viewTransition>
            <time dateTime={night.startsAt}>{posterDate(night.startsAt)}</time>
          </Link>
        </h3>
        <p className="mono event-card-meta">
          {clockTime(night.startsAt)} – {night.closes} · {venue.host}
        </p>
        <p className="mono event-card-lineup">{lineupPreview(night)}</p>
        <div className="event-card-actions">
          <Link to={href} className="button button--small" viewTransition>
            View event
          </Link>
          <TicketButton night={night} className="button--small" />
        </div>
      </div>
    </article>
  )
}

/** The next event, given the most room on the home page. */
export function EventFeature({ night, now, offset }: { night: NightView; now: number; offset: number }) {
  const { venue } = useCopy()
  const href = eventPath(night)
  const doors = Date.parse(night.startsAt)
  return (
    <article className="event-feature">
      <Link to={href} className="event-feature-art" tabIndex={-1} aria-hidden viewTransition>
        <EventArt artwork={night.artwork} sizes="(max-width: 860px) 92vw, 42vw" eager />
      </Link>
      <div className="event-feature-body">
        <p className="label event-feature-kicker">
          <span className="event-feature-dot" aria-hidden />
          Next up · {night.title}
        </p>
        <h3 className="hand event-feature-date">
          <Link to={href} viewTransition>
            <time dateTime={night.startsAt}>{posterDate(night.startsAt)}</time>
          </Link>
          <Note className="event-feature-note" arrow="arrow" flip delay={700}>
            see you there
          </Note>
        </h3>
        <p className="label event-feature-meta">
          {clockTime(night.startsAt)} – {night.closes} · {venue.host}, {venue.suburb}
        </p>
        {night.acts.length ? (
          <Lineup acts={night.acts} />
        ) : (
          <p className="mono event-feature-lineup">Line-up to be announced</p>
        )}
        <div className="button-row event-feature-actions">
          <TicketButton night={night} />
          <Link to={href} className="button" viewTransition>
            View event
          </Link>
        </div>
        {doors > now && (
          <p className="mono event-feature-countdown">
            Doors in <Countdown to={doors} now={now} offset={offset} />
          </p>
        )}
      </div>
    </article>
  )
}
