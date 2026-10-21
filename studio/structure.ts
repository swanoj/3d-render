import { CalendarIcon } from '@sanity/icons/Calendar'
import { CaseIcon } from '@sanity/icons/Case'
import { ClipboardIcon } from '@sanity/icons/Clipboard'
import { ClockIcon } from '@sanity/icons/Clock'
import { ConfettiIcon } from '@sanity/icons/Confetti'
import { CreditCardIcon } from '@sanity/icons/CreditCard'
import { DocumentsIcon } from '@sanity/icons/Documents'
import { EnvelopeIcon } from '@sanity/icons/Envelope'
import { HelpCircleIcon } from '@sanity/icons/HelpCircle'
import { HomeIcon } from '@sanity/icons/Home'
import { ImagesIcon } from '@sanity/icons/Images'
import { InfoOutlineIcon } from '@sanity/icons/InfoOutline'
import { PinIcon } from '@sanity/icons/Pin'
import { UserIcon } from '@sanity/icons/User'
import { UsersIcon } from '@sanity/icons/Users'
import type { ComponentType } from 'react'
import type { StructureBuilder, StructureResolver } from 'sanity/structure'

/** Documents that are set up already and edited in place: never created from the "new" menu, copied or deleted. */
export const fixedTypes = new Set([
  'weekly',
  'homePage',
  'eventsPage',
  'ticketsPage',
  'birthdaysPage',
  'boothsPage',
  'faqPage',
  'contactPage',
  'careersPage',
  'enquiryForm',
  'about',
  'settings',
])

/** The site's pages, in its menu's order: [document, title, icon]. */
const PAGES: [string, string, ComponentType][] = [
  ['homePage', 'Home', HomeIcon],
  ['eventsPage', 'Events', CalendarIcon],
  ['ticketsPage', 'Tickets', CreditCardIcon],
  ['birthdaysPage', 'Birthdays', ConfettiIcon],
  ['boothsPage', 'Booths', UsersIcon],
  ['faqPage', 'FAQs', HelpCircleIcon],
  ['contactPage', 'Contact', EnvelopeIcon],
  ['careersPage', 'Join the team', CaseIcon],
]

/** The enquiry forms: [document, title, icon]. Each is an `enquiryForm`, set up by the seed script. */
const FORMS: [string, string, ComponentType][] = [
  ['form-birthday', 'Birthday enquiry', ConfettiIcon],
  ['form-booth', 'Booth enquiry', UsersIcon],
  ['form-careers', 'Join the team', CaseIcon],
  ['form-contact', 'Contact', EnvelopeIcon],
]

// A night counts as coming up until it's over (doors plus seven hours).
const RUNNING = '60 * 60 * 7'

function fixed(S: StructureBuilder, type: string, id: string, title: string, icon: ComponentType) {
  return S.listItem().id(id).title(title).icon(icon).child(S.document().schemaType(type).documentId(id).title(title))
}

/**
 * The back office's sidebar: the nights first (what's coming up, what's been, and what every Saturday starts with),
 * then the acts, then the site's pages and forms, then the words and details every page shares.
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
      fixed(S, 'weekly', 'weekly', 'Every Saturday', ImagesIcon),
      S.divider(),
      S.documentTypeListItem('act').title('Acts').icon(UserIcon),
      S.divider(),
      S.listItem()
        .id('pages')
        .title('Pages')
        .icon(DocumentsIcon)
        .child(S.list().title('Pages').items(PAGES.map(([id, title, icon]) => fixed(S, id, id, title, icon)))),
      S.listItem()
        .id('forms')
        .title('Forms')
        .icon(ClipboardIcon)
        .child(S.list().title('Forms').items(FORMS.map(([id, title, icon]) => fixed(S, 'enquiryForm', id, title, icon)))),
      S.divider(),
      fixed(S, 'about', 'about', 'About Club Casa', InfoOutlineIcon),
      fixed(S, 'settings', 'settings', 'Venue & contact', PinIcon),
    ])
