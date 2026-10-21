import { PinIcon } from '@sanity/icons/Pin'
import { defineArrayMember, defineField, defineType } from 'sanity'

/**
 * The details every page shows: where the night is, the door policy, how to reach the team and how to get there.
 * Empty contact fields show as "to be confirmed" on the site.
 */
export const settings = defineType({
  name: 'settings',
  title: 'Venue & contact',
  type: 'document',
  icon: PinIcon,
  groups: [
    { name: 'venue', title: 'Venue', default: true },
    { name: 'contact', title: 'Contact' },
    { name: 'gettingThere', title: 'Getting there' },
  ],
  fields: [
    defineField({
      name: 'venue',
      title: 'Venue',
      type: 'object',
      group: 'venue',
      description: 'In the footer, on the contact page, on each night and in what search engines know about the venue.',
      fields: [
        defineField({ name: 'name', title: 'Venue name', type: 'string', description: 'Like "Prince Bandroom".', validation: (rule) => rule.required() }),
        defineField({ name: 'street', title: 'Street', type: 'string', validation: (rule) => rule.required() }),
        defineField({ name: 'suburb', title: 'Suburb', type: 'string', validation: (rule) => rule.required() }),
        defineField({ name: 'state', title: 'State', type: 'string', validation: (rule) => rule.required() }),
        defineField({ name: 'postcode', title: 'Postcode', type: 'string', validation: (rule) => rule.required().regex(/^\d{4}$/, { name: 'postcode' }) }),
        defineField({
          name: 'mapUrl',
          title: 'Map link',
          type: 'url',
          description: 'Optional. Without one, "Google Maps" searches for the address.',
        }),
      ],
    }),
    defineField({
      name: 'entry',
      title: 'Entry rule',
      type: 'string',
      group: 'venue',
      description: 'Like "18+ only. Bring valid photo ID." In the footer, on Tickets and on each night.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'email',
      title: 'Contact email',
      type: 'string',
      group: 'contact',
      description: 'Shown in the footer and on the contact page, and given to search engines.',
      validation: (rule) => rule.email(),
    }),
    defineField({
      name: 'instagram',
      title: 'Instagram handle',
      type: 'string',
      group: 'contact',
      description: 'Like @clubcasa.',
      validation: (rule) => rule.regex(/^@?[A-Za-z0-9._]{1,30}$/, { name: 'Instagram handle' }),
    }),
    defineField({
      name: 'gettingThere',
      title: 'Getting there',
      type: 'array',
      group: 'gettingThere',
      description: 'On the contact page.',
      of: [
        defineArrayMember({
          name: 'way',
          type: 'object',
          fields: [
            defineField({ name: 'label', title: 'How', type: 'string', description: '"Tram", "Ride share or taxi".', validation: (rule) => rule.required() }),
            defineField({ name: 'text', title: 'Details', type: 'text', rows: 2, validation: (rule) => rule.required() }),
          ],
          preview: { select: { title: 'label', subtitle: 'text' } },
        }),
      ],
    }),
  ],
  preview: { prepare: () => ({ title: 'Venue & contact' }) },
})
