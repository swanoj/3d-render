import { CalendarIcon } from '@sanity/icons/Calendar'
import { CaseIcon } from '@sanity/icons/Case'
import { ConfettiIcon } from '@sanity/icons/Confetti'
import { CreditCardIcon } from '@sanity/icons/CreditCard'
import { EnvelopeIcon } from '@sanity/icons/Envelope'
import { HomeIcon } from '@sanity/icons/Home'
import { UsersIcon } from '@sanity/icons/Users'
import { defineArrayMember, defineField, defineType } from 'sanity'
import { offerMember } from './shared'

/*
 * The site's pages, one document each: the words at the top of each page, and what's particular to it. Anything left
 * empty on the booking pages shows on the site as "to be confirmed", so nothing is guessed before the venue confirms
 * it. The FAQs' page is in faqPage.ts.
 */

export function introField(page: string, more = '') {
  return defineField({
    name: 'intro',
    title: 'Intro',
    type: 'text',
    rows: 3,
    description: `Under the title at the top of ${page}.${more ? ` ${more}` : ''}`,
    validation: (rule) => rule.required(),
  })
}

export function labelField(page: string) {
  return defineField({
    name: 'label',
    title: 'Label',
    type: 'string',
    description: `The small line above the title on ${page}.`,
    validation: (rule) => rule.required(),
  })
}

function planField(name: string, title: string) {
  return defineField({
    name,
    title,
    type: 'object',
    fields: [
      defineField({ name: 'text', title: 'Text', type: 'string', validation: (rule) => rule.required() }),
      defineField({ name: 'action', title: 'Link', type: 'string', description: 'At the bottom of the card, like "Get tickets".', validation: (rule) => rule.required() }),
    ],
  })
}

export const homePage = defineType({
  name: 'homePage',
  title: 'Home',
  type: 'document',
  icon: HomeIcon,
  fields: [
    defineField({
      name: 'plans',
      title: 'Plan your night',
      type: 'object',
      description: 'The three cards near the bottom of the home page. The tagline and the About text are in About Club Casa.',
      fields: [planField('tickets', 'Tickets'), planField('birthdays', 'Birthdays'), planField('booths', 'Booths')],
    }),
  ],
  preview: { prepare: () => ({ title: 'Home' }) },
})

export const eventsPage = defineType({
  name: 'eventsPage',
  title: 'Events',
  type: 'document',
  icon: CalendarIcon,
  fields: [introField('the Events page')],
  preview: { prepare: () => ({ title: 'Events' }) },
})

export const ticketsPage = defineType({
  name: 'ticketsPage',
  title: 'Tickets',
  type: 'document',
  icon: CreditCardIcon,
  fields: [
    introField('the Tickets page'),
    defineField({
      name: 'partner',
      title: 'Ticketing partner',
      type: 'string',
      description: 'Who sells the tickets. Under "Where to buy". Each night’s own ticket link is set on the night.',
    }),
    defineField({
      name: 'prices',
      title: 'Entry prices',
      type: 'text',
      rows: 2,
      description: 'A line on prices for every night, under "Price". Each night’s "Tickets from" price is set on the night.',
    }),
  ],
  preview: { prepare: () => ({ title: 'Tickets' }) },
})

export const birthdaysPage = defineType({
  name: 'birthdaysPage',
  title: 'Birthdays',
  type: 'document',
  icon: ConfettiIcon,
  fields: [
    labelField('the Birthdays page'),
    introField('the Birthdays page'),
    defineField({
      name: 'packages',
      title: 'Packages',
      type: 'array',
      description: 'Listed beside the birthday enquiry form, in this order. Until there’s one, the page says "to be confirmed".',
      of: [offerMember],
    }),
  ],
  preview: { prepare: () => ({ title: 'Birthdays' }) },
})

export const boothsPage = defineType({
  name: 'boothsPage',
  title: 'Booths',
  type: 'document',
  icon: UsersIcon,
  fields: [
    labelField('the Booths page'),
    introField('the Booths page'),
    defineField({
      name: 'options',
      title: 'Booths & VIP',
      type: 'array',
      description: 'Listed beside the booth enquiry form, in this order. Until there’s one, the page says "to be confirmed".',
      of: [offerMember],
    }),
  ],
  preview: { prepare: () => ({ title: 'Booths' }) },
})

export const contactPage = defineType({
  name: 'contactPage',
  title: 'Contact',
  type: 'document',
  icon: EnvelopeIcon,
  fields: [labelField('the Contact page'), introField('the Contact page', 'The address, email and Instagram are in Venue & contact.')],
  preview: { prepare: () => ({ title: 'Contact' }) },
})

export const careersPage = defineType({
  name: 'careersPage',
  title: 'Join the team',
  type: 'document',
  icon: CaseIcon,
  fields: [
    labelField('the Join the team page'),
    introField('the Join the team page'),
    defineField({
      name: 'roles',
      title: 'Who we’re looking for',
      type: 'array',
      description: 'In this order. The choices in the application form’s "Interested in" are in Forms.',
      of: [
        defineArrayMember({
          name: 'role',
          type: 'object',
          fields: [
            defineField({ name: 'title', title: 'Role', type: 'string', validation: (rule) => rule.required() }),
            defineField({ name: 'text', title: 'Line under it', type: 'string', validation: (rule) => rule.required() }),
          ],
          preview: { select: { title: 'title', subtitle: 'text' } },
        }),
      ],
    }),
  ],
  preview: { prepare: () => ({ title: 'Join the team' }) },
})
