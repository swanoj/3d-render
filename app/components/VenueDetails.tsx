import { brand } from '../brand/brand'
import { Pending } from './Pending'

/**
 * The venue's essentials: where, when and how to reach the team. Used on the contact page and in the footer. The
 * email and Instagram show as marked placeholders until they're set in brand.ts.
 */
export function VenueDetails({ className }: { className?: string }) {
  const { venue, hours, contact } = brand
  return (
    <dl className={['venue-details', className].filter(Boolean).join(' ')}>
      <div>
        <dt>Venue</dt>
        <dd>
          {venue.name}
          <br />
          At the {venue.host}
        </dd>
      </div>
      <div>
        <dt>Address</dt>
        <dd>
          <address>
            {venue.street}
            <br />
            {venue.locality}
          </address>
          <a href={venue.mapUrl} target="_blank" rel="noreferrer">
            Google Maps ↗
          </a>
        </dd>
      </div>
      <div>
        <dt>Opening hours</dt>
        <dd>
          {hours.days}
          <br />
          {hours.span}
        </dd>
      </div>
      <div>
        <dt>Email</dt>
        <dd>
          {contact.email ? <a href={`mailto:${contact.email}`}>{contact.email}</a> : <Pending>Contact email</Pending>}
        </dd>
      </div>
      <div>
        <dt>Instagram</dt>
        <dd>
          {contact.instagram ? (
            <a href={`https://www.instagram.com/${contact.instagram.replace(/^@/, '')}/`} target="_blank" rel="noreferrer">
              @{contact.instagram.replace(/^@/, '')} ↗
            </a>
          ) : (
            <Pending>Instagram handle</Pending>
          )}
        </dd>
      </div>
    </dl>
  )
}
