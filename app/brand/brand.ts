/**
 * Club Casa's brand, from the official Club Casa Brand Guideline and branding pack (Alicyte Design, October 2026):
 * the palette, the logos and mascot in public/brand/official, the type and the copy. Everything brand-specific lives
 * here and in app/content/.
 */

/**
 * The four colours on the guideline's palette page. The swatches (and every post in the pack) are these four; two of
 * the printed hex labels say #AA1F23 and #EE2324 instead, which match no swatch, so the swatch colours win. Nothing
 * else: the guideline asks for no colours beyond its palette.
 */
export const palette = {
  orange: '#E95E27',
  charcoal: '#212121',
  stone: '#CCC6BA',
  cream: '#EDE1D3',
}

/**
 * Colourways: the guideline's three poster grounds. Charcoal leads, as on the posts; cream is the paper stock; orange
 * is for moments. A page (or an event) picks one, and the wordmark wall, the lamp glow and the page colours fade to it.
 */
export type MoodId = 'charcoal' | 'cream' | 'orange'

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
  // The charcoal posts: cream type, stone wordmarks and orange accents.
  charcoal: {
    label: 'Charcoal',
    base: palette.charcoal,
    ink: palette.cream,
    accent: palette.orange,
    onAccent: palette.charcoal,
    pattern: palette.stone,
    patternOpacity: 0.06,
    glow: palette.orange,
    glowStrength: 0.2,
  },
  // The cream posts: paper stock with charcoal type and orange marks.
  cream: {
    label: 'Cream',
    base: palette.cream,
    ink: palette.charcoal,
    accent: palette.orange,
    onAccent: palette.charcoal,
    pattern: palette.orange,
    patternOpacity: 0.12,
    glow: '#F6A25E',
    glowStrength: 0.1,
  },
  // The orange posts: tone-on-tone wordmarks behind cream type.
  orange: {
    label: 'Orange',
    base: palette.orange,
    ink: palette.cream,
    accent: palette.charcoal,
    onAccent: palette.cream,
    pattern: '#D23A1B',
    patternOpacity: 0.5,
    glow: '#FFB067',
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

/**
 * Details the venue hasn't confirmed yet render as clearly marked placeholders (see the Pending component) until
 * they're filled in here.
 */
export const pending = null

export const brand = {
  name: 'Club Casa',
  /** From the guideline's closing page. */
  tagline: 'A house away from home.',
  description:
    'Club Casa: a warm, analogue-inspired club night of forward-thinking house music. Every Saturday, 10PM until 5AM, at the Prince Bandroom in St Kilda.',
  /** The brand statement from the guideline. */
  intro:
    'Club Casa is a warm, analogue-inspired club experience built around nostalgia, intimacy and forward-thinking house music. The space blends earthy tones, warm lighting, retro objects and handwritten details to create a moody, understated atmosphere that feels both familiar and unexpected. A place to escape the everyday, gather with friends and lose yourself in the night.',
  /** The house copy set small on the posts. */
  houseCopy:
    'Club Casa opens its doors for another night of music, movement and everything in between. A place to lose track of time, meet someone new and stay a little longer than planned.',
  mascot: {
    /** Previously Otto. */
    name: 'Casa',
    description: 'The charming, mysterious character of Club Casa, inspired by vintage European design and analogue culture.',
  },
  hours: {
    days: 'Every Saturday',
    time: '10PM – 5AM',
    /** Doors and close, for listings and structured data. */
    opens: '22:00',
    closes: '05:00',
    span: '10PM until 5AM Sunday',
    long: 'Every Saturday, 10PM until 5AM Sunday',
  },
  defaultMood: 'charcoal' as MoodId,
  locale: 'en-AU',
  timeZone: 'Australia/Melbourne',
  /** The header's links; the menu and footer add the rest. */
  nav: [
    { label: 'Events', to: '/events' },
    { label: 'Tickets', to: '/tickets' },
    { label: 'Birthdays', to: '/birthdays' },
    { label: 'Booths', to: '/booths' },
    { label: 'FAQs', to: '/faqs' },
    { label: 'Contact', to: '/contact' },
  ] satisfies NavItem[],
  moreNav: [{ label: 'Join the team', to: '/careers' }] satisfies NavItem[],
  venue: {
    name: 'Club Casa',
    /** Where the night happens. */
    host: 'Prince Bandroom',
    note: 'At the Prince Bandroom',
    street: '29 Fitzroy Street',
    locality: 'St Kilda VIC 3182',
    suburb: 'St Kilda',
    state: 'VIC',
    postcode: '3182',
    country: 'AU',
    mapUrl:
      'https://www.google.com/maps/search/?api=1&query=Prince+Bandroom+29+Fitzroy+Street+St+Kilda+VIC+3182',
  },
  /** Not confirmed yet: each shows as a marked placeholder until it's set. */
  contact: {
    email: pending as string | null,
    instagram: pending as string | null,
  },
  entry: '18+ only. Bring valid photo ID.',
  newsletter: {
    heading: 'Get on the list',
    body: 'First word on new events, line-ups and tickets.',
  },
}

export function pageTitle(title?: string) {
  return title ? `${title} | ${brand.name}` : `${brand.name} | ${brand.tagline.replace('.', '')}`
}
