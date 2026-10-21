import { brand, isMoodId } from '../brand/brand'
import { localIso, posterDate } from '../lib/format'
import { cmsImageUrl, cmsQuery, type SanityImage } from '../lib/sanity.server'
import { isEnquiryKind, type EnquiryKind } from './enquiries'
import type { FaqItem } from './faq'
import type { Pages, Plan, Role } from './pages'
import type { SiteCopy, Venue } from './site'
import type { Artist, Artwork, Night, NightStatus, Offer, Photo } from './types'

/*
 * What the back office has published, in the shapes the pages already use. One query fetches all of it (it's a
 * small site), and content.server.ts merges it over the content files: a night or act published in the back
 * office replaces the file's one with the same slug, a cancelled night takes its date off the calendar, and the
 * FAQs and getting there replace the files' once they're saved there. For the words (the shared copy, each page's
 * and the forms'), whatever's filled in replaces the site's own, and anything left blank keeps it.
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
  "weekly": *[_id == "weekly"][0]{ posters, doors, closes },
  "about": *[_id == "about"][0]{ tagline, about, description, newsletter, shareImage },
  "settings": *[_id == "settings"][0]{ email, instagram, gettingThere[]{ label, text }, venue, entry },
  "home": *[_id == "homePage"][0]{ plans },
  "events": *[_id == "eventsPage"][0]{ intro },
  "tickets": *[_id == "ticketsPage"][0]{ intro, partner, prices },
  "birthdays": *[_id == "birthdaysPage"][0]{ label, intro, "offers": packages[]{ name, guests, price, includes } },
  "booths": *[_id == "boothsPage"][0]{ label, intro, "offers": options[]{ name, guests, price, includes } },
  "faqs": *[_id == "faqPage"][0]{ label, intro, items[]{ question, answer, pending, link } },
  "contact": *[_id == "contactPage"][0]{ label, intro },
  "careers": *[_id == "careersPage"][0]{ label, intro, roles[]{ title, text } },
  "forms": *[_type == "enquiryForm"]{ _id, title, submit, sent, fields[]{ name, label, placeholder, options } }
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
type CmsPage = { label?: string; intro?: string }
type CmsPlans = Partial<Record<keyof Pages['home']['plans'], Partial<Plan>>>

export interface CmsForm {
  title?: string
  submit?: string
  sent?: string
  fields?: { name?: string; label?: string; placeholder?: string; options?: string[] }[]
}

interface CmsContent {
  nights?: CmsNight[]
  acts?: CmsAct[]
  weekly?: { posters?: SanityImage[]; doors?: string; closes?: string } | null
  about?: {
    tagline?: string
    about?: string
    description?: string
    newsletter?: { heading?: string; body?: string }
    shareImage?: SanityImage
  } | null
  settings?: {
    email?: string
    instagram?: string
    gettingThere?: { label?: string; text?: string }[]
    venue?: { name?: string; street?: string; suburb?: string; state?: string; postcode?: string; mapUrl?: string }
    entry?: string
  } | null
  home?: { plans?: CmsPlans } | null
  events?: CmsPage | null
  tickets?: (CmsPage & { partner?: string; prices?: string }) | null
  birthdays?: (CmsPage & { offers?: CmsOffer[] }) | null
  booths?: (CmsPage & { offers?: CmsOffer[] }) | null
  faqs?: (CmsPage & { items?: { question?: string; answer?: string; pending?: string; link?: { label?: string; to?: string } }[] }) | null
  contact?: CmsPage | null
  careers?: (CmsPage & { roles?: { title?: string; text?: string }[] }) | null
  forms?: (CmsForm & { _id: string })[]
}

/** The shared words and details that are filled in, to lay over the site's own (site.ts). */
export interface CmsSiteCopy {
  words: Partial<Pick<SiteCopy, 'tagline' | 'about' | 'description' | 'entry' | 'shareImage'>>
  newsletter: Partial<SiteCopy['newsletter']>
  address: Partial<Pick<Venue, 'host' | 'street' | 'suburb' | 'state' | 'postcode' | 'mapUrl'>>
  /** Doors and close, 24-hour. */
  hours: { opens?: string; closes?: string }
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
  site: CmsSiteCopy
  /** Each page's words that are filled in. */
  pages: { home: { plans: CmsPlans } } & { [Name in Exclude<keyof Pages, 'home'>]: Partial<Pages[Name]> }
  /** Each enquiry form's words. */
  forms: Partial<Record<EnquiryKind, CmsForm>>
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

/** Only what's filled in: blank text and empty lists keep the site's own. */
function filled<T extends Record<string, unknown>>(fields: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined && !(Array.isArray(value) && !value.length)),
  ) as Partial<T>
}

/** A 24-hour time, "22:00", or nothing. */
function time(value: string | undefined) {
  const trimmed = text(value)
  return trimmed && /^([01]\d|2[0-3]):[0-5]\d$/.test(trimmed) ? trimmed : undefined
}

function page(doc: CmsPage | null | undefined) {
  return filled({ label: text(doc?.label), intro: text(doc?.intro) })
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
  const faq = (content.faqs?.items ?? []).flatMap((item) =>
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
  const weeklyArtwork = (content.weekly?.posters ?? []).flatMap((image) => {
    const src = cmsImageUrl(image, 1080, 1350)
    return src ? [{ src, small: cmsImageUrl(image, 540, 675), alt: image.alt ?? `${brand.name}: the weekly poster` }] : []
  })
  const { about, settings, tickets, birthdays, booths, careers } = content
  const plans = content.home?.plans ?? {}
  const forms: Partial<Record<EnquiryKind, CmsForm>> = {}
  for (const form of content.forms ?? []) {
    const kind = form._id.replace(/^form-/, '')
    if (isEnquiryKind(kind)) forms[kind] = form
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
    site: {
      words: filled({
        tagline: text(about?.tagline),
        about: text(about?.about),
        description: text(about?.description),
        entry: text(settings?.entry),
        shareImage: about?.shareImage?.asset
          ? { src: cmsImageUrl(about.shareImage, 1200, 630) ?? '', alt: about.shareImage.alt ?? brand.name, width: 1200, height: 630 }
          : undefined,
      }),
      newsletter: filled({ heading: text(about?.newsletter?.heading), body: text(about?.newsletter?.body) }),
      address: filled({
        host: text(settings?.venue?.name),
        street: text(settings?.venue?.street),
        suburb: text(settings?.venue?.suburb),
        state: text(settings?.venue?.state),
        postcode: text(settings?.venue?.postcode),
        mapUrl: text(settings?.venue?.mapUrl),
      }),
      hours: filled({ opens: time(content.weekly?.doors), closes: time(content.weekly?.closes) }),
    },
    pages: {
      home: {
        plans: Object.fromEntries(
          Object.entries(plans).map(([kind, plan]) => [kind, filled({ text: text(plan?.text), action: text(plan?.action) })]),
        ),
      },
      events: page(content.events),
      tickets: filled({ intro: text(tickets?.intro), partner: text(tickets?.partner), prices: text(tickets?.prices) }),
      birthdays: { ...page(birthdays), ...filled({ packages: toOffers(birthdays?.offers) }) },
      booths: { ...page(booths), ...filled({ options: toOffers(booths?.offers) }) },
      faqs: page(content.faqs),
      contact: page(content.contact),
      careers: {
        ...page(careers),
        ...filled({
          roles: (careers?.roles ?? []).flatMap((role): Role[] => {
            const [title, words] = [text(role.title), text(role.text)]
            return title && words ? [{ title, text: words }] : []
          }),
        }),
      },
    },
    forms,
  }
}
