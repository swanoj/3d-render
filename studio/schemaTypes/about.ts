import { InfoOutlineIcon } from '@sanity/icons/InfoOutline'
import { defineField, defineType } from 'sanity'
import { imageField } from './shared'

/**
 * The words every page shares: the tagline, the About text, how search engines and shared links describe the club, and
 * the mailing list.
 */
export const about = defineType({
  name: 'about',
  title: 'About Club Casa',
  type: 'document',
  icon: InfoOutlineIcon,
  fields: [
    defineField({
      name: 'tagline',
      title: 'Tagline',
      type: 'string',
      description: 'Under the logo on the home page, in the footer and in the home page’s title in search results.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'about',
      title: 'About',
      type: 'text',
      rows: 6,
      description: 'The About section on the home page. AI assistants read it too.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Search & sharing description',
      type: 'text',
      rows: 3,
      description: 'How Google and shared links describe Club Casa, on pages without their own. About 160 characters.',
      validation: (rule) => [rule.required(), rule.max(200).warning('Search results cut it off after about 160 characters.')],
    }),
    imageField(
      'shareImage',
      'Share picture',
      'What a shared link to the site shows, on pages without a picture of their own. 1200 × 630. It has the tagline, hours and venue on it, so make a new one if those change.',
    ),
    defineField({
      name: 'newsletter',
      title: 'Mailing list',
      type: 'object',
      description: 'The sign-up at the bottom of every page.',
      fields: [
        defineField({ name: 'heading', title: 'Heading', type: 'string', validation: (rule) => rule.required() }),
        defineField({ name: 'body', title: 'Line under it', type: 'string', validation: (rule) => rule.required() }),
      ],
    }),
  ],
  preview: { prepare: () => ({ title: 'About Club Casa' }) },
})
