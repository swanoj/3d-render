import { CalendarIcon } from '@sanity/icons/Calendar'
import { defineArrayMember, defineField, defineType } from 'sanity'
import { melbourneDay, nextSaturdayDoors, posterDate } from '../lib/melbourne'
import { imageField, imageMember, moods } from './shared'

const STATUS_LABELS: Record<string, string> = {
  announced: 'Tickets soon',
  'on-sale': 'On sale',
  'sold-out': 'Sold out',
}

type NightDocument = { status?: string; lineup?: { name?: string }[] }

/**
 * A night at Club Casa. Every Saturday shows on the site as "Club Casa, line-up to be announced", and the coming eight
 * are already in Coming up (see lib/weekly.ts): open one and fill it in. A new night is for a one-off on another date.
 */
export const night = defineType({
  name: 'night',
  title: 'Night',
  type: 'document',
  icon: CalendarIcon,
  groups: [
    { name: 'night', title: 'The night', default: true },
    { name: 'lineup', title: 'Line-up' },
    { name: 'tickets', title: 'Tickets' },
    { name: 'media', title: 'Poster & photos' },
  ],
  fields: [
    defineField({
      name: 'startsAt',
      title: 'Doors',
      type: 'datetime',
      group: 'night',
      description: 'Melbourne time. Every Saturday is already in Coming up, so a new night is for a one-off on another date.',
      initialValue: () => nextSaturdayDoors(),
      options: { timeStep: 15 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Web address',
      type: 'slug',
      group: 'night',
      description: 'The end of the page address, …/events/2026-10-24. Generate takes it from the date.',
      options: {
        source: (doc) => melbourneDay((doc as { startsAt?: string }).startsAt),
        slugify: (value: string) => value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, ''),
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'title',
      title: 'Name',
      type: 'string',
      group: 'night',
      description: 'Shown above the date. "Club Casa" for a regular Saturday, or something like "Opening night".',
      initialValue: 'Club Casa',
    }),
    defineField({
      name: 'closes',
      title: 'Closes',
      type: 'string',
      group: 'night',
      description: 'As the poster says it: "5AM", "Late".',
      initialValue: '5AM',
    }),
    defineField({
      name: 'mood',
      title: 'Colourway',
      type: 'string',
      group: 'night',
      description: 'The night page fades to this colourway.',
      options: { list: moods, layout: 'radio', direction: 'horizontal' },
      initialValue: 'charcoal',
    }),
    defineField({
      name: 'vinyl',
      title: 'All-vinyl night',
      type: 'boolean',
      group: 'night',
      description: 'Adds the vinyl badge to the night.',
      initialValue: false,
    }),
    defineField({
      name: 'cancelled',
      title: 'Cancelled',
      type: 'boolean',
      group: 'night',
      description:
        'Takes the night off the site, for a closure or a private event. Leave it here rather than deleting it: a deleted Saturday comes back the next time the back office opens.',
      initialValue: false,
    }),

    defineField({
      name: 'lineup',
      title: 'Line-up',
      type: 'array',
      group: 'lineup',
      description: 'In poster order. Leave it empty and the page says "line-up to be announced".',
      of: [
        defineArrayMember({
          name: 'lineupAct',
          type: 'object',
          fields: [
            defineField({ name: 'name', title: 'Name', type: 'string', validation: (rule) => rule.required() }),
            defineField({
              name: 'act',
              title: 'Their page',
              type: 'reference',
              to: [{ type: 'act' }],
              description: 'Optional. Links the name to the act’s page.',
            }),
            defineField({
              name: 'phase',
              title: 'Reveal phase',
              type: 'number',
              description: 'Leave empty to show them from the start. Phase 2 or later stays redacted until that phase drops.',
              validation: (rule) => rule.integer().min(2),
            }),
          ],
          preview: {
            select: { title: 'name', phase: 'phase' },
            prepare: ({ title, phase }) => ({ title, subtitle: phase ? `Revealed in phase ${phase}` : 'Announced' }),
          },
        }),
      ],
    }),
    defineField({
      name: 'lineupConfirmed',
      title: 'Line-up is booked',
      type: 'boolean',
      group: 'lineup',
      description: 'Turn on once these are confirmed bookings. Until then the names stay out of search results and calendars.',
      initialValue: false,
    }),
    defineField({
      name: 'phases',
      title: 'Reveal phases',
      type: 'array',
      group: 'lineup',
      description: 'When each later phase drops. Until then the page shows those acts as redacted bars with a countdown.',
      of: [
        defineArrayMember({
          name: 'phase',
          type: 'object',
          fields: [
            defineField({ name: 'phase', title: 'Phase', type: 'number', validation: (rule) => rule.required().integer().min(2) }),
            defineField({ name: 'at', title: 'Drops at', type: 'datetime', validation: (rule) => rule.required() }),
          ],
          preview: {
            select: { phase: 'phase', at: 'at' },
            prepare: ({ phase, at }) => ({ title: `Phase ${phase ?? '?'}`, subtitle: at ? new Date(at).toLocaleString('en-AU') : '' }),
          },
        }),
      ],
    }),
    defineField({
      name: 'setTimes',
      title: 'Set times',
      type: 'array',
      group: 'lineup',
      description: 'On the night, the page shows who’s on now.',
      of: [
        defineArrayMember({
          name: 'set',
          type: 'object',
          fields: [
            defineField({
              name: 'act',
              title: 'Act',
              type: 'string',
              description: 'Exactly as it’s written in the line-up.',
              validation: (rule) =>
                rule.required().custom((act, context) => {
                  const names = ((context.document as NightDocument | undefined)?.lineup ?? []).map((item) => item.name)
                  return !act || names.includes(act) ? true : 'Use a name from the line-up, spelled the same way.'
                }),
            }),
            defineField({ name: 'start', title: 'Starts', type: 'datetime', validation: (rule) => rule.required() }),
          ],
          preview: {
            select: { act: 'act', start: 'start' },
            prepare: ({ act, start }) => ({
              title: act,
              subtitle: start ? new Date(start).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' }) : '',
            }),
          },
        }),
      ],
    }),

    defineField({
      name: 'status',
      title: 'Tickets',
      type: 'string',
      group: 'tickets',
      options: {
        list: [
          { title: 'Not on sale yet', value: 'announced' },
          { title: 'On sale', value: 'on-sale' },
          { title: 'Sold out', value: 'sold-out' },
        ],
        layout: 'radio',
      },
      initialValue: 'announced',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'ticketUrl',
      title: 'Ticket link',
      type: 'url',
      group: 'tickets',
      description: 'The night’s page on the ticketing site. "Get tickets" goes here.',
      validation: (rule) =>
        rule.uri({ scheme: ['https', 'http'] }).custom((url, context) =>
          (context.document as NightDocument | undefined)?.status === 'on-sale' && !url
            ? 'Add the ticket link before putting the night on sale.'
            : true,
        ),
    }),
    defineField({
      name: 'priceFrom',
      title: 'Tickets from (AUD)',
      type: 'number',
      group: 'tickets',
      description: 'The cheapest ticket, e.g. 25. Leave it empty until prices are set: the page says "to be confirmed".',
      validation: (rule) => rule.min(0),
    }),

    imageField(
      'poster',
      'Poster',
      'The night’s artwork, 4:5 (at least 1080 × 1350). Without one, the night uses the weekly posts.',
      'media',
    ),
    defineField({
      name: 'photos',
      title: 'Photos from the night',
      type: 'array',
      group: 'media',
      description: 'After the night. Keep faces out of frame: the room stays a little mysterious.',
      of: [imageMember],
      options: { layout: 'grid' },
    }),
  ],
  orderings: [
    { title: 'Date, soonest first', name: 'startsAtAsc', by: [{ field: 'startsAt', direction: 'asc' }] },
    { title: 'Date, latest first', name: 'startsAtDesc', by: [{ field: 'startsAt', direction: 'desc' }] },
  ],
  preview: {
    select: { startsAt: 'startsAt', title: 'title', status: 'status', media: 'poster', lineup: 'lineup', cancelled: 'cancelled' },
    prepare: ({ startsAt, title, status, media, lineup, cancelled }) => {
      const names = ((lineup as { name?: string }[] | undefined) ?? []).flatMap((act) => (act.name ? [act.name] : []))
      const acts = names.length > 2 ? `${names.slice(0, 2).join(', ')} +${names.length - 2}` : names.join(', ')
      return {
        title: posterDate(startsAt),
        subtitle: cancelled
          ? 'Cancelled: not on the site'
          : [title && title !== 'Club Casa' ? title : null, STATUS_LABELS[status as string] ?? null, acts || 'Line-up TBA']
              .filter(Boolean)
              .join(' · '),
        media,
      }
    },
  },
})
