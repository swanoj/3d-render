import type { Night } from '../content/types'

interface TicketButtonProps {
  night: Pick<Night, 'status' | 'ticketUrl'>
  className?: string
}

/** "Get tickets" once a night is on sale; until then it says so, without pretending to be a link. */
export function TicketButton({ night, className }: TicketButtonProps) {
  const classes = (...names: string[]) => [...names, className].filter(Boolean).join(' ')
  if (night.status === 'sold-out') {
    return <span className={classes('button', 'button--static')}>Sold out</span>
  }
  if (night.status === 'on-sale' && night.ticketUrl) {
    return (
      <a className={classes('button', 'button--solid')} href={night.ticketUrl} target="_blank" rel="noreferrer">
        Get tickets ↗
      </a>
    )
  }
  return <span className={classes('button', 'button--static')}>Tickets soon</span>
}
