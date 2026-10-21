import { brand } from '../brand/brand'

/*
 * The words and details every page shares: the tagline, the About text, how search engines and shared links describe
 * the club, the entry rule, the mailing list's pitch, the venue and the opening hours. These are the site's own; the
 * back office's About Club Casa, Venue & contact and Every Saturday take over once they're saved there
 * (content.server.ts). The hours and the map link are worked out from doors, close and the address, so they always
 * agree with each other.
 */

export interface Venue {
  /** The club, as the venue lists it. */
  name: string
  /** Where the night happens: "Prince Bandroom". */
  host: string
  street: string
  suburb: string
  state: string
  postcode: string
  country: string
  /** "St Kilda VIC 3182" */
  locality: string
  mapUrl: string
}

export interface Hours {
  days: string
  /** "10PM – 5AM" */
  time: string
  /** Doors and close, 24-hour, for listings and structured data: "22:00", "05:00". */
  opens: string
  closes: string
  /** "10PM until 5AM Sunday" */
  span: string
  /** "Every Saturday, 10PM until 5AM Sunday" */
  long: string
}

/** A picture for shared links, unless the page has its own (an event's poster, say). 1200 × 630 shows best. */
export interface ShareImage {
  src: string
  alt: string
  width?: number
  height?: number
}

export interface SiteCopy {
  /** From the guideline's closing page. */
  tagline: string
  /** The brand statement from the guideline, in About on the home page. */
  about: string
  /** How search engines and shared links describe the club. */
  description: string
  /** The door policy. */
  entry: string
  newsletter: { heading: string; body: string }
  /** It has the tagline, hours and venue on it, so it's replaced when those change. */
  shareImage: ShareImage
  venue: Venue
  hours: Hours
}

/** A 24-hour time ("22:00") as the posters write it: "10PM", or "9:30PM". */
export function clock(time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  return `${hours % 12 || 12}${minutes ? `:${String(minutes).padStart(2, '0')}` : ''}${hours < 12 ? 'AM' : 'PM'}`
}

/** The opening hours, worded every way the pages need them, from doors and close ("22:00", "05:00"). */
export function hoursFrom(opens: string, closes: string): Hours {
  // Closing at or before doors means the next morning.
  const span = `${clock(opens)} until ${clock(closes)}${closes <= opens ? ' Sunday' : ''}`
  return { days: 'Every Saturday', time: `${clock(opens)} – ${clock(closes)}`, opens, closes, span, long: `Every Saturday, ${span}` }
}

/** The venue's address, with its locality and a map link worked out from it unless a link is given. */
export function venueFrom(address: Pick<Venue, 'host' | 'street' | 'suburb' | 'state' | 'postcode'> & { mapUrl?: string }): Venue {
  const locality = `${address.suburb} ${address.state} ${address.postcode}`
  const search = encodeURIComponent(`${address.host} ${address.street} ${locality}`).replace(/%20/g, '+')
  return {
    name: brand.name,
    country: 'AU',
    ...address,
    locality,
    mapUrl: address.mapUrl || `https://www.google.com/maps/search/?api=1&query=${search}`,
  }
}

export const site: SiteCopy = {
  tagline: 'A house away from home.',
  about:
    'Club Casa is a warm, analogue-inspired club experience built around nostalgia, intimacy and forward-thinking house music. The space blends earthy tones, warm lighting, retro objects and handwritten details to create a moody, understated atmosphere that feels both familiar and unexpected. A place to escape the everyday, gather with friends and lose yourself in the night.',
  description:
    'Club Casa: a warm, analogue-inspired club night of forward-thinking house music. Every Saturday, 10PM until 5AM, at the Prince Bandroom in St Kilda.',
  entry: '18+ only. Bring valid photo ID.',
  newsletter: {
    heading: 'Get on the list',
    body: 'First word on new events, line-ups and tickets.',
  },
  shareImage: {
    src: '/share/club-casa.png',
    alt: 'Club Casa: every Saturday, 10PM until 5AM, at the Prince Bandroom, St Kilda',
    width: 1200,
    height: 630,
  },
  venue: venueFrom({ host: 'Prince Bandroom', street: '29 Fitzroy Street', suburb: 'St Kilda', state: 'VIC', postcode: '3182' }),
  hours: hoursFrom('22:00', '05:00'),
}
