/*
 * Brand marks. The logos, emblem and mascot are the official files from the Club Casa branding pack
 * (public/brand/official, trimmed to their artwork); the scribbles are the hand-drawn marks from the same designer's
 * scribble sheet (public/brand/*.svg). Each renders as a CSS mask filled with currentColor, so one file serves every
 * colourway.
 */
export const marks = {
  logo: ['official/primary-logo.png', 1664, 225],
  'logo-stroke': ['official/primary-stroke-logo.png', 1783, 241],
  'logo-stacked': ['official/stacked-logo.png', 844, 481],
  'logo-stacked-stroke': ['official/stacked-stroke-logo.png', 842, 480],
  'logo-tilted': ['official/tilted-scribble-logo.png', 1809, 577],
  'logo-emblem': ['official/emblem-primary-logo.png', 1570, 212],
  'logo-mascot': ['official/mascot-logo.png', 1649, 316],
  emblem: ['official/emblem.png', 257, 212],
  mascot: ['official/mascot.png', 319, 314],
  circle: ['circle.svg', 624, 660],
  oval: ['oval.svg', 660, 222],
  underline: ['underline.svg', 678, 216],
  'double-line': ['double-line.svg', 672, 210],
  check: ['check.svg', 560, 440],
  cross: ['cross.svg', 623, 707],
  squiggle: ['squiggle.svg', 840, 116],
} as const

export type MarkName = keyof typeof marks

/** A mark's file, for preloading. */
export const markUrl = (name: MarkName) => `/brand/${marks[name][0]}`
