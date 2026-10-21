import type { Offer } from '../content/types'

/** Birthday packages or booth options from the back office: the name, who it's for, the price and what's included. */
export function Offers({ offers }: { offers: Offer[] }) {
  return (
    <ul className="offer-list">
      {offers.map((offer) => {
        const details = [offer.guests, offer.price].filter(Boolean).join(' · ')
        return (
          <li key={offer.name} className="offer">
            <p className="offer-name">{offer.name}</p>
            {details && <p className="mono offer-details">{details}</p>}
            {offer.includes && <p className="mono offer-includes">{offer.includes}</p>}
          </li>
        )
      })}
    </ul>
  )
}
