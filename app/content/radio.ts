import type { Mix } from './types'

/*
 * What Casa Radio plays, in order, and the records in the DJ desk's crate. The first four are grooves synthesised
 * in the browser, so the radio works before any mixes exist. Add residents' mixes as audio files (see Mix.src);
 * they play in this order and loop.
 */
export const mixes: Mix[] = [
  {
    id: 'house-groove',
    title: 'The house groove',
    artist: 'Casa residents',
    artistSlug: 'casa-residents',
    groove: 'house',
    sleeve: 'orange',
  },
  {
    id: 'deep-hours',
    title: 'Deep hours',
    artist: 'Casa residents',
    artistSlug: 'casa-residents',
    groove: 'deep',
    sleeve: 'charcoal',
  },
  {
    id: 'disco-edit',
    title: 'Disco edit',
    artist: 'Casa residents',
    artistSlug: 'casa-residents',
    groove: 'disco',
    sleeve: 'pink',
  },
  {
    id: 'sunday-vinyl',
    title: 'Sunday vinyl',
    artist: 'Casa residents',
    artistSlug: 'casa-residents',
    groove: 'sunday',
    sleeve: 'cream',
  },
]
