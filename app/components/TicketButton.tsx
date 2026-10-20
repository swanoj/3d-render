import type { Night } from '../content/types'
import { track } from '../lib/analytics'

interface TicketButtonProps {
  night: Pick<Night, 'status' | 'ticketUrl'> & { slug?: string }
  className?: string
}

/** "Get tickets" once a night is on sale; until then it says so, without pretending to be a link. */
export function TicketButton({ night, className }: TicketButtonProps) {
  const classes = (...names: string[]) => [...names, className].filter(Boolean).join(' ')
  if (night.status === 'sold-out') {
    return <span className={classes('button', 'button--static')}>Sold out</span>
  }
  if (night.status === 'on-sale' && night.ticketUrl) {
    // The sale happens on the ticketing site, so the click is the moment to count.
    const onClick = () => track('ticket_click', { event: night.slug ?? null })
    return (
      <a
        className={classes('button', 'button--solid')}
        href={night.ticketUrl}
        target="_blank"
        rel="noreferrer"
        onClick={onClick}
      >
        Get tickets ↗
      </a>
    )
  }
  return <span className={classes('button', 'button--static')}>Tickets soon</span>
}
