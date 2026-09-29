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
  /** Acts in poster order. Empty until the line-up is announced. */
  lineup: Act[]
  /**
   * When each reveal phase drops (ISO timestamps). Phase 1 is out from the start; an act in a later phase shows
   * as a redacted bar, with a countdown, until its phase drops.
   */
  phases?: { phase: number; at: string }[]
  /** Set times for the night, by act name. Night-of mode shows who's on now. */
  setTimes?: { act: string; start: string }[]
  /** True once the line-up is real bookings. Until then it stays out of search results and calendar files. */
  lineupConfirmed?: boolean
  /** External ticketing link. Without one the page points people to the mailing list. */
  ticketUrl?: string
  status: NightStatus
}

export interface Act {
  name: string
  /** Slug of the act's page in artists.ts, if they have one. */
  artist?: string
  /** Reveal phase (see Night.phases). Leave out for acts announced from the start. */
  phase?: number
}

/** An act as the pages see it: a hidden act's name never leaves the server. */
export type ShownAct = { hidden: false; name: string; artist?: string } | { hidden: true; phase: number; at: string }

/** A night as the pages see it: the line-up with its reveals applied. */
export interface NightView extends Omit<Night, 'lineup' | 'phases' | 'setTimes'> {
  /** Names announced so far, in poster order. */
  lineup: string[]
  /** The whole poster line-up, hidden acts included as redacted entries. */
  acts: ShownAct[]
  /** The next reveal, if any acts are still hidden. */
  nextDrop: { at: string; count: number } | null
  /** Set times; a hidden act's name is null until it drops. */
  setTimes: { start: string; name: string | null; artist?: string }[]
}

export interface Artist {
  slug: string
  name: string
  /** A line under the name: "Resident", "Melbourne", "Berlin". */
  from: string
  /** A few sentences in the house voice. */
  bio: string
  /** Portrait in /public (e.g. "/artists/casa-residents.jpg"). Without one the page draws a record. */
  photo?: string
  links?: { label: string; url: string }[]
  /** Id of their mix in radio.ts, so the page can put it on Casa Radio. */
  mix?: string
}

/** The grooves the browser can play itself, for mixes without an audio file. */
export type GrooveId = 'house' | 'deep' | 'disco' | 'sunday'

/** Something Casa Radio can play. Without a `src` it plays one of the grooves synthesised in the browser. */
export interface Mix {
  id: string
  title: string
  artist: string
  /** Slug of the artist's page, if any. */
  artistSlug?: string
  /**
   * An audio file (MP3 or M4A). Put it in /public/mixes, or on a host that allows cross-origin requests (the
   * lamps listen to the music, which needs CORS).
   */
  src?: string
  /** Which synthesised groove plays when there's no `src` (the house groove by default). */
  groove?: GrooveId
  /** The sleeve's colourway in the DJ desk's record crate. */
  sleeve?: MoodId
}

/** A photo from a night, shown faded and grainy. Keep faces out of frame: the night stays mysterious. */
export interface Photo {
  src: string
  alt: string
  nightSlug?: string
}
