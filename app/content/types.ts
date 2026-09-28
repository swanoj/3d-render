import type { MoodId } from '../brand/brand'

export type NightStatus = 'announced' | 'on-sale' | 'sold-out'

/** Hand-drawn doodles that stamp each night (stand-ins until the weekly mascot artwork exists). */
export type MotifName = 'tv' | 'lamp' | 'plant' | 'record' | 'mirror' | 'star'

export interface Night {
  /** URL slug; the date keeps it unique, e.g. "2026-10-16". */
  slug: string
  /** Shown above the date, e.g. "Opening night". */
  title: string
  /** Doors, as an ISO timestamp with the Melbourne offset: "2026-10-16T22:00:00+11:00". */
  startsAt: string
  /** How the night ends on the poster: "Late", "3AM". */
  closes: string
  /** Colourway. */
  mood: MoodId
  /** The night's hand-drawn stamp. */
  motif: MotifName
  /** "vinyl" marks the monthly all-vinyl nights. */
  format?: 'vinyl'
  /** Artists in poster order. Empty until the line-up is announced. */
  lineup: string[]
  /** True once the line-up is real bookings. Until then it stays out of search results and calendar files. */
  lineupConfirmed?: boolean
  /** External ticketing link. Without one the page points people to the mailing list. */
  ticketUrl?: string
  status: NightStatus
}

/** A photo from a night, shown faded and grainy. Keep faces out of frame: the night stays mysterious. */
export interface Photo {
  src: string
  alt: string
  nightSlug?: string
}
