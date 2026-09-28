import type { MoodId } from '../brand/brand'

export type NightStatus = 'announced' | 'on-sale' | 'sold-out'

export interface Night {
  /** URL slug; the date keeps it unique, e.g. "2026-10-16". */
  slug: string
  /** Shown above the date, e.g. "Opening night". */
  title: string
  /** Doors, as an ISO timestamp with the Melbourne offset: "2026-10-16T22:00:00+11:00". */
  startsAt: string
  /** How the night ends on the poster: "Late", "3AM". */
  closes: string
  /** Poster colourway. */
  mood: MoodId
  /** Artists in poster order. Empty until the line-up is announced. */
  lineup: string[]
  /** External ticketing link. Without one the page points people to the mailing list. */
  ticketUrl?: string
  status: NightStatus
}
