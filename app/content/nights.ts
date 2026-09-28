import type { Night } from './types'

/*
 * PLACEHOLDER SCHEDULE. The opening line-up is copied from the poster mock-ups in the asset set. The posters say
 * "Friday 18th Oct", but 18 October 2026 is a Sunday, so opening night sits on Friday 16 October until the real
 * date is confirmed. The two later nights only show how the list looks. No ticket links yet.
 */
export const nights: Night[] = [
  {
    slug: '2026-10-16',
    title: 'Opening night',
    startsAt: '2026-10-16T22:00:00+11:00',
    closes: 'Late',
    mood: 'orange',
    lineup: [
      'Raresh',
      'Rhadoo',
      'Antal',
      'Sedouin',
      'Chloe Caillet',
      'Kamma & Masalo',
      'Leon Vynehall',
      'Luke Alessi',
      'Mano Le Tough',
      'Pascal Moscheni',
      'Roi Perez',
    ],
    status: 'announced',
  },
  {
    slug: '2026-10-23',
    title: 'Club Casa',
    startsAt: '2026-10-23T22:00:00+11:00',
    closes: 'Late',
    mood: 'cream',
    lineup: [],
    status: 'announced',
  },
  {
    slug: '2026-10-30',
    title: 'Club Casa',
    startsAt: '2026-10-30T22:00:00+11:00',
    closes: 'Late',
    mood: 'charcoal',
    lineup: [],
    status: 'announced',
  },
]
