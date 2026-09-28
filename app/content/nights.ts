import type { Night } from './types'

/*
 * PLACEHOLDER SCHEDULE. Replace before launch:
 * - The Alicyte poster mock-ups use a line-up copied from a Circoloco DC-10 flyer in the moodboard (dummy text,
 *   not a booking), so the line-ups here are neutral placeholders.
 * - The posters say "Friday 18th Oct", but 18 October 2026 is a Sunday; opening night sits on Friday 16 October
 *   until the real date is confirmed.
 * - The later nights, including the monthly vinyl night from the concept deck, only show how the site handles
 *   them. No ticket links yet.
 * - The reveal phases and set times on opening night show how the phased line-up and night-of mode work. Set the
 *   real drop dates and times (Melbourne time: +10:00 until 4 October, +11:00 after).
 */
export const nights: Night[] = [
  {
    slug: '2026-10-16',
    title: 'Opening night',
    startsAt: '2026-10-16T22:00:00+11:00',
    closes: 'Late',
    mood: 'orange',
    motif: 'tv',
    lineup: [
      { name: 'Headliner TBA', phase: 2 },
      { name: 'Special guest', phase: 2 },
      { name: 'Casa residents', artist: 'casa-residents' },
    ],
    phases: [{ phase: 2, at: '2026-10-02T18:00:00+10:00' }],
    setTimes: [
      { act: 'Casa residents', start: '2026-10-16T22:00:00+11:00' },
      { act: 'Special guest', start: '2026-10-17T00:00:00+11:00' },
      { act: 'Headliner TBA', start: '2026-10-17T01:30:00+11:00' },
      { act: 'Casa residents', start: '2026-10-17T03:30:00+11:00' },
    ],
    status: 'announced',
  },
  {
    slug: '2026-10-23',
    title: 'Club Casa',
    startsAt: '2026-10-23T22:00:00+11:00',
    closes: 'Late',
    mood: 'red',
    motif: 'lamp',
    lineup: [],
    status: 'announced',
  },
  {
    slug: '2026-10-30',
    title: 'Club Casa',
    startsAt: '2026-10-30T22:00:00+11:00',
    closes: 'Late',
    mood: 'pink',
    motif: 'plant',
    lineup: [],
    status: 'announced',
  },
  {
    slug: '2026-11-06',
    title: 'Vinyl night',
    startsAt: '2026-11-06T22:00:00+11:00',
    closes: 'Late',
    mood: 'charcoal',
    motif: 'record',
    format: 'vinyl',
    lineup: [],
    status: 'announced',
  },
]
