import type { Night } from './types'

/*
 * The events calendar. Club Casa runs every Saturday, 10PM until 5AM Sunday, and content.server.ts fills in the
 * coming Saturdays from that rule with placeholders: "Club Casa", line-up to be announced, tickets soon.
 *
 * To announce a night, add it here under its date slug ("2026-10-24"): its title, artwork, line-up, set times and
 * ticket link replace the placeholder for that Saturday. A one-off on another day works the same way. Keep line-ups
 * empty until they're confirmed bookings; the pages say "line-up to be announced" rather than showing names.
 *
 * Example:
 *   {
 *     slug: '2026-10-31',
 *     title: 'Club Casa',
 *     startsAt: '2026-10-31T22:00:00+11:00',
 *     closes: '5AM',
 *     mood: 'charcoal',
 *     artwork: { src: '/artwork/2026-10-31.jpg', alt: 'Club Casa, 31 October: the poster' },
 *     lineup: [{ name: 'Casa residents', artist: 'casa-residents' }],
 *     lineupConfirmed: true,
 *     ticketUrl: 'https://…',
 *     status: 'on-sale',
 *   },
 */
export const nights: Night[] = []
