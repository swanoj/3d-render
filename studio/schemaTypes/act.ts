import { UserIcon } from '@sanity/icons/User'
import { defineArrayMember, defineField, defineType } from 'sanity'

/** The Casa Radio mixes in the site code (app/content/radio.ts) an act's page can play. */
const MIXES = [
  { title: 'House groove', value: 'house-groove' },
  { title: 'Deep hours', value: 'deep-hours' },
  { title: 'Disco edit', value: 'disco-edit' },
  { title: 'Sunday vinyl', value: 'sunday-vinyl' },
]

/** A DJ or act with their own page. A night's line-up can link a name to it. */
export const act = defineType({
  name: 'act',
  title: 'Act',
  type: 'document',
  icon: UserIcon,
  fields: [
    defineField({ name: 'name', title: 'Name', type: 'string', validation: (rule) => rule.required() }),
    defineField({
      name: 'slug',
      title: 'Web address',
      type: 'slug',
      description: 'The end of their page address, …/artists/casa-residents.',
      options: { source: 'name' },
      validation: (rule) => rule.required(),
    }),
    defineField({ name: 'from', title: 'Line under the name', type: 'string', description: '"Resident", "Melbourne", "Berlin".' }),
    defineField({ name: 'bio', title: 'Bio', type: 'text', rows: 5, description: 'A few sentences in the house voice.' }),
    defineField({
      name: 'photo',
      title: 'Portrait',
      type: 'image',
      description: 'Square works best. Without one, the page draws a record.',
      options: { hotspot: true },
    }),
    defineField({
      name: 'links',
      title: 'Links',
      type: 'array',
      of: [
        defineArrayMember({
          name: 'link',
          type: 'object',
          fields: [
            defineField({ name: 'label', title: 'Label', type: 'string', description: '"Instagram", "SoundCloud", "RA".', validation: (rule) => rule.required() }),
            defineField({ name: 'url', title: 'Address', type: 'url', validation: (rule) => rule.required() }),
          ],
          preview: { select: { title: 'label', subtitle: 'url' } },
        }),
      ],
    }),
    defineField({
      name: 'mix',
      title: 'Their mix on Casa Radio',
      type: 'string',
      options: { list: MIXES },
    }),
  ],
  preview: { select: { title: 'name', subtitle: 'from', media: 'photo' } },
})
