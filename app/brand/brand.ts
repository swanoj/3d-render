/**
 * Club Casa's brand: the Alicyte Design asset set (palette, logos, type, posters) plus the supporting tones and
 * room concept from the Prince Bandroom concept deck. Everything brand-specific lives here and in app/content/.
 */

/**
 * The four colours on the Alicyte palette sheet (sampled from the swatches; two printed labels differ), plus the
 * concept deck's supporting tones: "dark pink and red", and "subdued green" for the plants.
 */
export const palette = {
  orange: '#E95E27',
  charcoal: '#212121',
  stone: '#CCC6BA',
  cream: '#EDE1D3',
  red: '#AA1F23',
  pink: '#93304F',
  green: '#4F5B3A',
}

/** Colourways. Each night has one; the wordmark wall, the lamp glow and the page colours fade to it. */
export type MoodId = 'orange' | 'cream' | 'charcoal' | 'red' | 'pink'

export interface Mood {
  label: string
  /** Page background. */
  base: string
  /** Text. */
  ink: string
  /** Buttons and marker accents. */
  accent: string
  /** Text on an accent-coloured button. */
  onAccent: string
  /** Lettering of the repeated CLUB CASA wall behind the page. */
  pattern: string
  /** How strongly the wall shows through (0–1). */
  patternOpacity: number
  /** The warm lamp light that slowly breathes across the wall. */
  glow: string
  /** How bright those lamps get (0–1). */
  glowStrength: number
}

export const moods: Record<MoodId, Mood> = {
  // The orange poster: tone-on-tone wordmarks behind cream type.
  orange: {
    label: 'Orange',
    base: palette.orange,
    ink: palette.cream,
    accent: palette.charcoal,
    onAccent: palette.cream,
    pattern: '#D23A1B',
    patternOpacity: 0.55,
    glow: '#FFB067',
    glowStrength: 0.34,
  },
  // The cream poster: paper stock with orange type.
  cream: {
    label: 'Cream',
    base: palette.cream,
    ink: palette.charcoal,
    accent: palette.orange,
    onAccent: palette.charcoal,
    pattern: palette.orange,
    patternOpacity: 0.14,
    glow: '#F6A25E',
    glowStrength: 0.12,
  },
  // The charcoal artboard: cream logo on near-black.
  charcoal: {
    label: 'Charcoal',
    base: palette.charcoal,
    ink: palette.cream,
    accent: palette.orange,
    onAccent: palette.charcoal,
    pattern: palette.stone,
    patternOpacity: 0.07,
    glow: palette.orange,
    glowStrength: 0.3,
  },
  // Concept-deck supporting tone: warm, moody red.
  red: {
    label: 'Red',
    base: palette.red,
    ink: palette.cream,
    accent: palette.charcoal,
    onAccent: palette.cream,
    pattern: '#86151A',
    patternOpacity: 0.6,
    glow: '#FF7A45',
    glowStrength: 0.32,
  },
  // Concept-deck supporting tone: dark pink.
  pink: {
    label: 'Pink',
    base: palette.pink,
    ink: palette.cream,
    accent: palette.charcoal,
    onAccent: palette.cream,
    pattern: '#73223D',
    patternOpacity: 0.55,
    glow: '#FF8A5C',
    glowStrength: 0.3,
  },
}

export function isMoodId(value: unknown): value is MoodId {
  return typeof value === 'string' && value in moods
}

export interface NavItem {
  label: string
  to: string
}

export const brand = {
  name: 'Club Casa',
  description:
    'Club Casa: a night of music, movement and everything in between, upstairs at the Prince Bandroom in St Kilda.',
  /** The house copy from the typography sheet. */
  intro:
    'Club Casa opens its doors for another night of music, movement and everything in between. A place to lose track of time, meet someone new and stay a little longer than planned. Step inside, settle in and let the night take its own shape. From the first track to the last light, this is your room for the evening.',
  defaultMood: 'orange' as MoodId,
  locale: 'en-AU',
  timeZone: 'Australia/Melbourne',
  nav: [
    { label: 'Nights', to: '/nights' },
    { label: 'Info', to: '/info' },
  ] satisfies NavItem[],
  venue: {
    name: 'Prince Bandroom',
    note: 'Upstairs at the Prince',
    street: '29 Fitzroy Street',
    locality: 'St Kilda VIC 3182',
    suburb: 'St Kilda',
    state: 'VIC',
    postcode: '3182',
    country: 'AU',
    mapUrl:
      'https://www.google.com/maps/search/?api=1&query=Prince+Bandroom+29+Fitzroy+Street+St+Kilda+VIC+3182',
  },
  entry: '18+ only. Bring valid photo ID.',
  newsletter: {
    heading: 'Get on the list',
    body: 'First word on new nights, line-ups and tickets.',
  },
}

export function pageTitle(title?: string) {
  return title ? `${title} | ${brand.name}` : `${brand.name} | Prince Bandroom, St Kilda`
}
