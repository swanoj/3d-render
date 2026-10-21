import { ImagesIcon } from '@sanity/icons/Images'
import { defineField, defineType } from 'sanity'
import { imageMember } from './shared'

/**
 * Every Saturday: the posts a Saturday wears as its poster until it has its own. The site gives each coming Saturday
 * one of these in turn, and new Saturdays in Coming up start with the same one.
 */
export const weekly = defineType({
  name: 'weekly',
  title: 'Every Saturday',
  type: 'document',
  icon: ImagesIcon,
  fields: [
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
