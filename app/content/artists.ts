import type { Artist } from './types'

/*
 * DRAFT: each act with a page. Add a portrait to /public/artists and their links as the line-up is booked; an act
 * in nights.ts links here through its `artist` slug.
 */
export const artists: Artist[] = [
  {
    slug: 'casa-residents',
    name: 'Casa residents',
    from: 'Resident',
    bio: 'The house DJs. They open every night with the lamps low and close it when the lights come up: deep, warm, forward-thinking house, played for the room rather than at it.',
    mix: 'house-groove',
  },
]
