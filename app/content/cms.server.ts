import { brand, isMoodId } from '../brand/brand'
import { localIso, posterDate } from '../lib/format'
import { cmsImageUrl, cmsQuery, type SanityImage } from '../lib/sanity.server'
import type { FaqItem } from './faq'
import type { Pages } from './pages'
import type { Artist, Artwork, Night, NightStatus, Offer, Photo } from './types'

/*
 * What the back office has published, in the shapes the pages already use. One query fetches all of it (it's a
 * small site), and content.server.ts merges it over the content files: a night or act published in the back
 * office replaces the file's one with the same slug, a cancelled night takes its date off the calendar, and the
 * weekly posters, the booking pages, the FAQs and the venue details replace the files' once they've been saved there.
 */

const CONTENT = /* groq */ `{
  "nights": *[_type == "night" && defined(startsAt)] | order(startsAt asc) {
    "slug": slug.current, title, startsAt, closes, mood, vinyl, cancelled, status, ticketUrl, priceFrom, lineupConfirmed,
    "lineup": lineup[]{ name, "artist": act->slug.current, phase },
    phases[]{ phase, at },
    setTimes[]{ act, start },
    poster,
    photos
  },
  "acts": *[_type == "act" && defined(slug.current)] {
    "slug": slug.current, name, from, bio, photo, links[]{ label, url }, mix
  },
  "weekly": *[_id == "weekly"][0].posters,
  "tickets": *[_id == "ticketsPage"][0]{ intro, partner, prices },
  "birthdays": *[_id == "birthdaysPage"][0]{ intro, "offers": packages[]{ name, guests, price, includes } },
  "booths": *[_id == "boothsPage"][0]{ intro, "offers": options[]{ name, guests, price, includes } },
  "faq": *[_id == "faqPage"][0].items[]{ question, answer, pending, link },
  "settings": *[_id == "settings"][0]{ email, instagram, gettingThere[]{ label, text } }
}`

interface CmsNight {
  slug?: string
  title?: string
  startsAt: string
  closes?: string
  mood?: string
  vinyl?: boolean
  cancelled?: boolean
  status?: string
  ticketUrl?: string
  priceFrom?: number
  lineupConfirmed?: boolean
  lineup?: { name?: string; artist?: string; phase?: number }[]
  phases?: { phase?: number; at?: string }[]
  setTimes?: { act?: string; start?: string }[]
  poster?: SanityImage
  photos?: SanityImage[]
}

interface CmsAct {
  slug: string
  name?: string
  from?: string
  bio?: string
  photo?: SanityImage
  links?: { label?: string; url?: string }[]
  mix?: string
}

type CmsOffer = { name?: string; guests?: string; price?: string; includes?: string }

interface CmsContent {
  nights?: CmsNight[]
  acts?: CmsAct[]
  weekly?: SanityImage[] | null
  tickets?: { intro?: string; partner?: string; prices?: string } | null
  birthdays?: { intro?: string; offers?: CmsOffer[] } | null
  booths?: { intro?: string; offers?: CmsOffer[] } | null
  faq?: { question?: string; answer?: string; pending?: string; link?: { label?: string; to?: string } }[] | null
  settings?: { email?: string; instagram?: string; gettingThere?: { label?: string; text?: string }[] } | null
}

export interface CmsSite {
  nights: Night[]
  /** The dates (and addresses) of cancelled nights: the calendar leaves them out. */
  off: Set<string>
  /** The posters every Saturday takes in turn. */
  weeklyArtwork: Artwork[] | null
  /** Night slug → its photos. */
  photos: Map<string, Photo[]>
  artists: Artist[]
  faq: FaqItem[] | null
  gettingThere: { label: string; text: string }[] | null
  contact: { email: string | null; instagram: string | null }
  /** The booking pages, once they're in the back office. An empty intro keeps the file's. */
  pages: {
    tickets: (Omit<Pages['tickets'], 'intro'> & { intro?: string }) | null
    birthdays: (Omit<Pages['birthdays'], 'intro'> & { intro?: string }) | null
    booths: (Omit<Pages['booths'], 'intro'> & { intro?: string }) | null
  }
}

const STATUSES: NightStatus[] = ['announced', 'on-sale', 'sold-out']

/** "2026-10-24": the night's date in Melbourne, which is also its address when the back office leaves it blank. */
function melbourneDay(iso: string) {
  return localIso(Date.parse(iso)).slice(0, 10)
}

/** Text from the back office, trimmed, or nothing when it's blank. */
function text(value: string | null | undefined) {
  return value?.trim() || undefined
}

function toOffers(offers: CmsOffer[] | undefined): Offer[] {
  return (offers ?? []).flatMap((offer) => {
    const [name, guests, price, includes] = [offer.name, offer.guests, offer.price, offer.includes].map(text)
    return name ? [{ name, ...(guests ? { guests } : {}), ...(price ? { price } : {}), ...(includes ? { includes } : {}) }] : []
  })
}

function toNight(doc: CmsNight): Night {
  const startsAt = localIso(Date.parse(doc.startsAt))
  const title = doc.title?.trim() || brand.name
  const poster = doc.poster?.asset
    ? {
        src: cmsImageUrl(doc.poster, 1080, 1350) ?? '',
        small: cmsImageUrl(doc.poster, 540, 675),
        alt: doc.poster.alt ?? `${brand.name}, ${startsAt.slice(0, 10)}: the poster`,
      }
    : undefined
  const lineup = (doc.lineup ?? []).flatMap((act) =>
    act.name?.trim()
      ? [{ name: act.name.trim(), ...(act.artist ? { artist: act.artist } : {}), ...(act.phase ? { phase: act.phase } : {}) }]
      : [],
  )
  return {
    slug: doc.slug || melbourneDay(doc.startsAt),
    title,
    startsAt,
    closes: doc.closes?.trim() || '5AM',
    mood: isMoodId(doc.mood) ? doc.mood : 'charcoal',
    ...(poster?.src ? { artwork: poster } : {}),
    ...(doc.vinyl ? { format: 'vinyl' as const } : {}),
    // A Saturday the back office keeps in Coming up with nothing announced yet is still the weekly placeholder.
    ...(!lineup.length && !doc.photos?.length && title === brand.name ? { placeholder: true } : {}),
    lineup,
    phases: (doc.phases ?? []).flatMap((p) => (p.phase && p.at ? [{ phase: p.phase, at: localIso(Date.parse(p.at)) }] : [])),
    setTimes: (doc.setTimes ?? []).flatMap((set) =>
      set.act && set.start ? [{ act: set.act, start: localIso(Date.parse(set.start)) }] : [],
    ),
    lineupConfirmed: Boolean(doc.lineupConfirmed),
    ...(doc.ticketUrl ? { ticketUrl: doc.ticketUrl } : {}),
    ...(typeof doc.priceFrom === 'number' ? { priceFrom: doc.priceFrom } : {}),
    status: STATUSES.includes(doc.status as NightStatus) ? (doc.status as NightStatus) : 'announced',
  }
}

/** Everything the back office has published, or null when it isn't connected. */
export async function cmsSite(): Promise<CmsSite | null> {
  const content = await cmsQuery<CmsContent>(CONTENT)
  if (!content) return null
  const dated = (content.nights ?? []).filter((doc) => !Number.isNaN(Date.parse(doc.startsAt)))
  const off = new Set(dated.flatMap((doc) => (doc.cancelled ? [melbourneDay(doc.startsAt), ...(doc.slug ? [doc.slug] : [])] : [])))
  const docs = dated.filter((doc) => !doc.cancelled)
  const nights = docs.map(toNight)
  const photos = new Map<string, Photo[]>()
  docs.forEach((doc, i) => {
    const night = nights[i]
    const shots = (doc.photos ?? []).flatMap((image) => {
      const src = cmsImageUrl(image, 1600)
      return src ? [{ src, alt: image.alt ?? `${brand.name}, ${posterDate(night.startsAt)}`, nightSlug: night.slug }] : []
    })
    if (shots.length) photos.set(night.slug, shots)
  })
  const faq = (content.faq ?? []).flatMap((item) =>
    item.question?.trim()
      ? [
          {
            question: item.question.trim(),
            ...(item.answer?.trim() ? { answer: item.answer.trim() } : {}),
            ...(item.pending?.trim() ? { pending: item.pending.trim() } : {}),
            ...(item.link?.label && item.link.to ? { link: { label: item.link.label, to: item.link.to } } : {}),
          },
        ]
      : [],
  )
  const gettingThere = (content.settings?.gettingThere ?? []).flatMap((way) =>
    way.label && way.text ? [{ label: way.label, text: way.text }] : [],
  )
  const weeklyArtwork = (content.weekly ?? []).flatMap((image) => {
    const src = cmsImageUrl(image, 1080, 1350)
    return src ? [{ src, small: cmsImageUrl(image, 540, 675), alt: image.alt ?? `${brand.name}: the weekly poster` }] : []
  })
  const { tickets, birthdays, booths } = content
  const intro = (page: { intro?: string } | null | undefined) => {
    const words = text(page?.intro)
    return words ? { intro: words } : {}
  }
  return {
    nights,
    off,
    weeklyArtwork: weeklyArtwork.length ? weeklyArtwork : null,
    photos,
    artists: (content.acts ?? []).flatMap((act) =>
      act.name
        ? [
            {
              slug: act.slug,
              name: act.name,
              from: act.from ?? '',
              bio: act.bio ?? '',
              ...(act.photo?.asset ? { photo: cmsImageUrl(act.photo, 800, 800) } : {}),
              ...(act.links?.length
                ? { links: act.links.flatMap((link) => (link.label && link.url ? [{ label: link.label, url: link.url }] : [])) }
                : {}),
              ...(act.mix ? { mix: act.mix } : {}),
            },
          ]
        : [],
    ),
    faq: faq.length ? faq : null,
    gettingThere: gettingThere.length ? gettingThere : null,
    contact: { email: content.settings?.email?.trim() || null, instagram: content.settings?.instagram?.trim() || null },
    pages: {
      tickets: tickets ? { ...intro(tickets), partner: text(tickets.partner) ?? null, prices: text(tickets.prices) ?? null } : null,
      birthdays: birthdays ? { ...intro(birthdays), packages: toOffers(birthdays.offers) } : null,
      booths: booths ? { ...intro(booths), options: toOffers(booths.offers) } : null,
    },
  }
}
