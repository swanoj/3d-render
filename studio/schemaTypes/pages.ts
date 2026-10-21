import { ConfettiIcon } from '@sanity/icons/Confetti'
import { CreditCardIcon } from '@sanity/icons/CreditCard'
import { UsersIcon } from '@sanity/icons/Users'
import { defineField, defineType } from 'sanity'
import { offerMember } from './shared'

/*
 * The booking pages: Tickets, Birthdays and Booths, one document each. Anything left empty shows on the site as
 * "to be confirmed", so nothing is guessed before the venue confirms it.
 */

function introField(page: string) {
  return defineField({
    name: 'intro',
    title: 'Intro',
    type: 'text',
    rows: 3,
    description: `Under the title at the top of ${page}.`,
    validation: (rule) => rule.required(),
  })
}

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
