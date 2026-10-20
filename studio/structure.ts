import { CalendarIcon } from '@sanity/icons/Calendar'
import { ClockIcon } from '@sanity/icons/Clock'
import { HelpCircleIcon } from '@sanity/icons/HelpCircle'
import { PinIcon } from '@sanity/icons/Pin'
import { UserIcon } from '@sanity/icons/User'
import type { StructureResolver } from 'sanity/structure'

/** Documents there's only ever one of, edited in place. */
export const singletons = new Set(['faqPage', 'settings'])

// A night counts as coming up until it's over (doors plus seven hours).
const RUNNING = '60 * 60 * 7'

/** The back office's sidebar, in the order the team needs it: what's coming up first. */
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
      S.divider(),
      S.documentTypeListItem('act').title('Acts').icon(UserIcon),
      S.divider(),
      S.listItem().title('FAQs').icon(HelpCircleIcon).child(S.document().schemaType('faqPage').documentId('faqPage').title('FAQs')),
      S.listItem()
        .title('Venue & contact')
        .icon(PinIcon)
        .child(S.document().schemaType('settings').documentId('settings').title('Venue & contact')),
    ])
