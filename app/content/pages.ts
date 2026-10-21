import type { Offer } from './types'

/** A kind of person the careers page asks to hear from. */
export interface Role {
  title: string
  text: string
}

/** One of the home page's "Plan your night" cards. */
export interface Plan {
  text: string
  /** The link at the bottom of the card. */
  action: string
}

/*
 * Each page's own words: its intro (and the small label above the title, where it isn't the opening hours), the home
 * page's "Plan your night" cards, the careers page's roles, and the details the venue hasn't confirmed yet, left empty
 * so the pages show them as marked placeholders. The back office's pages take over whatever's filled in there.
 */
export const pages = {
  home: {
    plans: {
      tickets: { text: 'Entry for every Saturday, online.', action: 'Get tickets' } as Plan,
      birthdays: { text: 'Celebrating? Tell us about the night you have in mind.', action: 'Plan a birthday' } as Plan,
      booths: { text: 'A booth for you and your friends, for the whole night.', action: 'Book a booth' } as Plan,
    },
  },
  events: {
    intro:
      'Every Saturday night at the Prince Bandroom, St Kilda. Line-ups go up here as they’re announced, with tickets for each night.',
  },
  tickets: {
    intro:
      'Tickets for every Club Casa night are sold online. Pick your Saturday below: each one opens for tickets when it goes on sale.',
    /** Who sells the tickets. */
    partner: null as string | null,
    /** A line on prices for every night. */
    prices: null as string | null,
  },
  birthdays: {
    label: 'Celebrate at Club Casa',
    intro:
      'Bring your people to Club Casa for your birthday. Tell us the Saturday you have in mind and how many are coming, and we’ll get back to you with what’s on offer.',
    packages: [] as Offer[],
  },
  booths: {
    label: 'Reservations & VIP',
    intro:
      'Reserve a booth for you and your group, for the whole night. Send an enquiry with your date and group size and we’ll come back to you with availability.',
    options: [] as Offer[],
  },
  faqs: {
    label: 'Good to know',
    intro: 'The questions we get asked most. Can’t find yours? Get in touch.',
  },
  contact: {
    label: 'Get in touch',
    intro:
      'Send us a message below. For birthdays, booths or joining the team, the forms on those pages go straight to the right person.',
  },
  careers: {
    label: 'Careers',
    intro:
      'Club Casa is made by the people who run the night. If you’d like to promote, host or be part of the team another way, we’d love to hear from you.',
    /** The kinds of people the brief asks to hear from. */
    roles: [
      { title: 'Promoters', text: 'Bring your crowd and help spread the word about the night.' },
      { title: 'Hosts', text: 'Welcome people in and help look after the room.' },
      { title: 'Something else', text: 'Want to be part of the team in another way? Tell us what you do.' },
    ] as Role[],
  },
}

export type Pages = typeof pages
