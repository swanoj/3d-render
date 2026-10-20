import { Link } from 'react-router'
import type { NightStatus, NightView } from '../content/types'
import { clockTime, dateParts } from '../lib/format'
import { eventPath } from '../lib/paths'
import { Mark } from './Mark'

const statusLabel: Record<NightStatus, string> = {
  announced: 'Tickets soon',
  'on-sale': 'Tickets on sale',
  'sold-out': 'Sold out',
}

export function NightRow({ night }: { night: NightView }) {
  const date = dateParts(night.startsAt)
  const more = night.lineup.length > 4 ? ` + ${night.lineup.length - 4} more` : night.nextDrop ? ' + more soon' : ''
  const preview = night.lineup.length ? night.lineup.slice(0, 4).join(' • ') + more : 'Line-up to be announced'

  return (
    <li>
      <Link to={eventPath(night)} className="night-row" viewTransition>
        <time dateTime={night.startsAt} className="night-date">
          <span className="night-day hand">{date.day}</span>
          <span className="night-month">
            {date.weekday} {date.month}
          </span>
          <Mark name="circle" className="night-date-circle" />
        </time>
        <span className="night-text">
          <span className="night-title-row">
            <span className="night-title">{night.title}</span>
            {night.format === 'vinyl' && <VinylBadge />}
          </span>
          <span className="night-lineup">{preview}</span>
        </span>
        <span className="night-meta">
          <span>
            {clockTime(night.startsAt)}–{night.closes}
          </span>
          <span className="night-status" data-status={night.status}>
            {night.status === 'sold-out' && <Mark name="cross" className="night-status-mark" />}
            {statusLabel[night.status]}
          </span>
        </span>
        <span className="night-arrow" aria-hidden>
          →
        </span>
      </Link>
    </li>
  )
}

/** "All vinyl", circled in marker, for the monthly vinyl nights. */
export function VinylBadge() {
  return (
    <span className="vinyl-badge">
      All vinyl
      <Mark name="oval" className="vinyl-badge-oval" style={{ aspectRatio: 'auto' }} />
    </span>
  )
}
