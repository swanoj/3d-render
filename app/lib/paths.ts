import type { Night } from '../content/types'

/** An event's page. */
export const eventPath = (night: Pick<Night, 'slug'>) => `/events/${night.slug}`
