import { CalendarIcon } from '@sanity/icons/Calendar'
import { ClockIcon } from '@sanity/icons/Clock'
import { ConfettiIcon } from '@sanity/icons/Confetti'
import { CreditCardIcon } from '@sanity/icons/CreditCard'
import { HelpCircleIcon } from '@sanity/icons/HelpCircle'
import { ImagesIcon } from '@sanity/icons/Images'
import { PinIcon } from '@sanity/icons/Pin'
import { UserIcon } from '@sanity/icons/User'
import { UsersIcon } from '@sanity/icons/Users'
import type { ComponentType } from 'react'
import type { StructureBuilder, StructureResolver } from 'sanity/structure'

/** Documents there's only ever one of, edited in place. */
export const singletons = new Set(['weekly', 'ticketsPage', 'birthdaysPage', 'boothsPage', 'faqPage', 'settings'])

// A night counts as coming up until it's over (doors plus seven hours).
const RUNNING = '60 * 60 * 7'

function singleton(S: StructureBuilder, id: string, title: string, icon: ComponentType) {
  return S.listItem().title(title).icon(icon).child(S.document().schemaType(id).documentId(id).title(title))
}

/**
 * The back office's sidebar, in the site's order: the nights first (what's coming up, what's been, and the posters
 * every Saturday wears), then the acts, then a page for each of the site's pages.
 */
export const structure: StructureResolver = (S) =>
  S.list()
    .title('Club Casa')
    .items([
      S.listItem()
        .title('Coming up')
        .icon(CalendarIcon)
        .child(
          S.documentList()
            .title('Coming up')
            .schemaType('night')
            .filter(`_type == "night" && dateTime(startsAt) > dateTime(now()) - ${RUNNING}`)
            .defaultOrdering([{ field: 'startsAt', direction: 'asc' }]),
        ),
      S.listItem()
        .title('Past nights')
        .icon(ClockIcon)
        .child(
          S.documentList()
            .title('Past nights')
            .schemaType('night')
            .filter(`_type == "night" && dateTime(startsAt) <= dateTime(now()) - ${RUNNING}`)
            .defaultOrdering([{ field: 'startsAt', direction: 'desc' }]),
        ),
      singleton(S, 'weekly', 'Every Saturday', ImagesIcon),
      S.divider(),
      S.documentTypeListItem('act').title('Acts').icon(UserIcon),
      S.divider(),
      singleton(S, 'ticketsPage', 'Tickets', CreditCardIcon),
      singleton(S, 'birthdaysPage', 'Birthdays', ConfettiIcon),
      singleton(S, 'boothsPage', 'Booths', UsersIcon),
      singleton(S, 'faqPage', 'FAQs', HelpCircleIcon),
      singleton(S, 'settings', 'Venue & contact', PinIcon),
    ])
