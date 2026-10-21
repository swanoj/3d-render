import { ImagesIcon } from '@sanity/icons/Images'
import { defineField, defineType } from 'sanity'
import { CLOSES, DOORS, timeOptions } from '../lib/weekly'
import { imageMember } from './shared'

/**
 * Every Saturday: the weekly night's doors and close (which are also the opening hours the whole site shows) and the
 * posts a Saturday wears as its poster until it has its own. New Saturdays in Coming up start with these.
 */
export const weekly = defineType({
  name: 'weekly',
  title: 'Every Saturday',
  type: 'document',
  icon: ImagesIcon,
  fields: [
    defineField({
      name: 'doors',
      title: 'Doors',
      type: 'string',
      description:
        'Also the opening hours on every page. Saturdays already in Coming up keep the doors they have: change those on the night.',
      options: { list: timeOptions('17:00', '23:30') },
      initialValue: DOORS,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'closes',
      title: 'Close',
      type: 'string',
      description: 'The next morning, if it’s earlier than doors.',
      options: { list: timeOptions('22:00', '08:00') },
      initialValue: CLOSES,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'posters',
      title: 'Weekly posters',
      type: 'array',
      description:
        'Posts with no date or line-up on them, 4:5. Each Saturday takes the next one in turn. Saturdays already in Coming up keep the poster they have: change it on the night.',
      of: [imageMember],
      options: { layout: 'grid' },
      validation: (rule) => rule.min(1).warning('Without one, the site uses the posters it came with.'),
    }),
  ],
  preview: { prepare: () => ({ title: 'Every Saturday' }) },
})
