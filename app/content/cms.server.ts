import { brand, isMoodId } from '../brand/brand'
import { localIso, posterDate } from '../lib/format'
import { cmsImageUrl, cmsQuery, type SanityImage } from '../lib/sanity.server'
import type { FaqItem } from './faq'
import type { Artist, Night, NightStatus, Photo } from './types'

/*
 * What the back office has published, in the shapes the pages already use. One query fetches all of it (it's a
 * small site), and content.server.ts merges it over the content files: a night or act published in the back
 * office replaces the file's one with the same slug, and the FAQs and venue details replace the files' once
 * they've been saved there.
 */

const CONTENT = /* groq */ `{
  "nights": *[_type == "night" && defined(startsAt)] | order(startsAt asc) {
    "slug": slug.current, title, startsAt, closes, mood, vinyl, status, ticketUrl, priceFrom, lineupConfirmed,
    "lineup": lineup[]{ name, "artist": act->slug.current, phase },
    phases[]{ phase, at },
    setTimes[]{ act, start },
    poster,
    photos
  },
  "acts": *[_type == "act" && defined(slug.current)] {
    "slug": slug.current, name, from, bio, photo, links[]{ label, url }, mix
  },
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

interface CmsContent {
  nights?: CmsNight[]
  acts?: CmsAct[]
  faq?: { question?: string; answer?: string; pending?: string; link?: { label?: string; to?: string } }[] | null
  settings?: { email?: string; instagram?: string; gettingThere?: { label?: string; text?: string }[] } | null
}

export interface CmsSite {
  nights: Night[]
  /** Night slug → its photos. */
  photos: Map<string, Photo[]>
  artists: Artist[]
  faq: FaqItem[] | null
  gettingThere: { label: string; text: string }[] | null
  contact: { email: string | null; instagram: string | null }
}

const STATUSES: NightStatus[] = ['announced', 'on-sale', 'sold-out']

/** "2026-10-24": the night's date in Melbourne, which is also its address when the back office leaves it blank. */
function melbourneDay(iso: string) {
  return localIso(Date.parse(iso)).slice(0, 10)
}

function toNight(doc: CmsNight): Night {
  const startsAt = localIso(Date.parse(doc.startsAt))
  const poster = doc.poster?.asset
    ? {
        src: cmsImageUrl(doc.poster, 1080, 1350) ?? '',
        small: cmsImageUrl(doc.poster, 540, 675),
        alt: doc.poster.alt ?? `${brand.name}, ${startsAt.slice(0, 10)}: the poster`,
      }
    : undefined
  return {
    slug: doc.slug || melbourneDay(doc.startsAt),
    title: doc.title?.trim() || brand.name,
    startsAt,
    closes: doc.closes?.trim() || '5AM',
    mood: isMoodId(doc.mood) ? doc.mood : 'charcoal',
    ...(poster?.src ? { artwork: poster } : {}),
    ...(doc.vinyl ? { format: 'vinyl' as const } : {}),
    lineup: (doc.lineup ?? []).flatMap((act) =>
      act.name?.trim()
        ? [{ name: act.name.trim(), ...(act.artist ? { artist: act.artist } : {}), ...(act.phase ? { phase: act.phase } : {}) }]
        : [],
    ),
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
  const docs = (content.nights ?? []).filter((doc) => !Number.isNaN(Date.parse(doc.startsAt)))
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
  return {
    nights,
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
  }
}
