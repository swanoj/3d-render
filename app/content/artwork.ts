import type { Artwork } from './types'

/*
 * Posts from the official branding pack that carry no date or line-up, so they can stand as the poster for any
 * Saturday until that night has its own artwork. Weekly placeholders take them in turn.
 */
export const weeklyArtwork: Artwork[] = [
  {
    src: '/artwork/every-saturday-1080.jpg',
    small: '/artwork/every-saturday-540.jpg',
    alt: 'Club Casa poster: the CLUB CASA wordmark repeated down the page, with "Every Saturday".',
  },
  {
    src: '/artwork/club-casa-decks-1080.jpg',
    small: '/artwork/club-casa-decks-540.jpg',
    alt: 'Club Casa poster: hands on the decks under the CLUB CASA logo, with the mascot.',
  },
  {
    src: '/artwork/club-casa-turntable-1080.jpg',
    small: '/artwork/club-casa-turntable-540.jpg',
    alt: 'Club Casa poster: a turntable in warm orange light behind the CLUB CASA logo.',
  },
  {
    src: '/artwork/club-casa-stacked-1080.jpg',
    small: '/artwork/club-casa-stacked-540.jpg',
    alt: 'Club Casa poster: the outlined CLUB CASA logo on charcoal.',
  },
]

/** The mascot's post, for the pages that want Casa front and centre. */
export const casaWasHere: Artwork = {
  src: '/artwork/casa-was-here-1080.jpg',
  small: '/artwork/casa-was-here-540.jpg',
  alt: 'Casa, the Club Casa mascot, in orange on charcoal: "Casa was here".',
}
