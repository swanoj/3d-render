import type { Night } from '../content/types'

/** "Tickets" once a night is on sale; until then it points people to the mailing list in the footer. */
export function TicketButton({ night }: { night: Night }) {
  if (night.status === 'sold-out') {
    return <span className="button button--static">Sold out</span>
  }
  if (night.status === 'on-sale' && night.ticketUrl) {
    return (
      <a className="button button--solid" href={night.ticketUrl} target="_blank" rel="noreferrer">
        Tickets
      </a>
    )
  }
  return (
    <a className="button button--solid" href="#list">
      Get on the list
    </a>
  )
}
