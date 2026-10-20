import { PinIcon } from '@sanity/icons/Pin'
import { defineArrayMember, defineField, defineType } from 'sanity'

/**
 * The details every page shows: how to reach the team, and how to get to the Prince Bandroom. Empty fields show as
 * "to be confirmed" on the site.
 */
export const settings = defineType({
  name: 'settings',
  title: 'Venue & contact',
  type: 'document',
  icon: PinIcon,
  fields: [
    defineField({
      name: 'email',
      title: 'Contact email',
      type: 'string',
      description: 'Shown in the footer and on the contact page, and given to search engines.',
      validation: (rule) => rule.email(),
    }),
    defineField({
      name: 'instagram',
      title: 'Instagram handle',
      type: 'string',
      description: 'Like @clubcasa.',
      validation: (rule) => rule.regex(/^@?[A-Za-z0-9._]{1,30}$/, { name: 'Instagram handle' }),
    }),
    defineField({
      name: 'gettingThere',
      title: 'Getting there',
      type: 'array',
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
