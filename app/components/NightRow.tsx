import { Link } from 'react-router'
import type { Night } from '../content/types'
import { clockTime, dateParts } from '../lib/format'
import { Mark } from './Mark'

const statusLabel: Record<Night['status'], string> = {
  announced: 'Tickets soon',
  'on-sale': 'On sale',
  'sold-out': 'Sold out',
}

export function NightRow({ night }: { night: Night }) {
  const date = dateParts(night.startsAt)
  const preview = night.lineup.length
    ? night.lineup.slice(0, 4).join(' • ') + (night.lineup.length > 4 ? ` + ${night.lineup.length - 4} more` : '')
    : 'Line-up soon'

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
          <span className="night-title">{night.title}</span>
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
