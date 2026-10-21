import type { Offer } from './types'

/*
 * The words on the booking pages: each one's intro, and the details the venue hasn't confirmed yet, left empty so the
 * pages show them as marked placeholders. The back office's Tickets, Birthdays and Booths take over once they're
 * saved there.
 */
export const pages = {
  tickets: {
    intro:
      'Tickets for every Club Casa night are sold online. Pick your Saturday below: each one opens for tickets when it goes on sale.',
    /** Who sells the tickets. */
    partner: null as string | null,
    /** A line on prices for every night. */
    prices: null as string | null,
  },
  birthdays: {
    intro:
      'Bring your people to Club Casa for your birthday. Tell us the Saturday you have in mind and how many are coming, and we’ll get back to you with what’s on offer.',
    packages: [] as Offer[],
  },
  booths: {
    intro:
      'Reserve a booth for you and your group, for the whole night. Send an enquiry with your date and group size and we’ll come back to you with availability.',
    options: [] as Offer[],
  },
}

export type Pages = typeof pages
