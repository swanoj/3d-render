import { Link } from 'react-router'
import type { NightStatus, NightView } from '../content/types'
import { clockTime, dateParts } from '../lib/format'
import { Mark } from './Mark'
import { Motif } from './Scribble'

const statusLabel: Record<NightStatus, string> = {
  announced: 'Tickets soon',
  'on-sale': 'On sale',
  'sold-out': 'Sold out',
}

export function NightRow({ night }: { night: NightView }) {
  const date = dateParts(night.startsAt)
  const more = night.lineup.length > 4 ? ` + ${night.lineup.length - 4} more` : night.nextDrop ? ' + more soon' : ''
  const preview = night.lineup.length ? night.lineup.slice(0, 4).join(' • ') + more : 'Line-up soon'

  return (
    <li>
      <Link to={`/nights/${night.slug}`} className="night-row" viewTransition>
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
            <Motif name={night.motif} className="night-motif" />
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
