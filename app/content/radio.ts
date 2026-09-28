import type { Mix } from './types'

/*
 * What Casa Radio plays, in order. The first entry is the house groove, synthesised in the browser, so the radio
 * works before any mixes exist. Add residents' mixes as audio files (see Mix.src); they play in this order and
 * loop.
 */
export const mixes: Mix[] = [
  { id: 'house-groove', title: 'The house groove', artist: 'Casa residents', artistSlug: 'casa-residents' },
]
