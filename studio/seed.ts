/*
 * Fills the back office with what the site already shows: the weekly posters and the coming Saturdays, the Tickets,
 * Birthdays and Booths pages, the FAQs, the venue and contact details, and the acts in app/content. Run it after
 * `npx sanity login`:
 *
 *   npm run seed
 *
 * It only creates what isn't there yet, so running it again never overwrites the team's edits.
 */
import { createReadStream } from 'node:fs'
import { basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getCliClient } from 'sanity/cli'
import { brand } from '../app/brand/brand'
import { artists } from '../app/content/artists'
import { weeklyArtwork } from '../app/content/artwork'
import { faq, gettingThere } from '../app/content/faq'
import { pages } from '../app/content/pages'
import { addComingSaturdays } from './lib/weekly'

const client = getCliClient({ apiVersion: '2025-02-19' })
const key = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48)

// The weekly posters, uploaded from the site's own files. Sanity knows a file it already has, so nothing is doubled.
const posters = []
for (const artwork of weeklyArtwork) {
  const file = fileURLToPath(new URL(`../public${artwork.src}`, import.meta.url))
  const asset = await client.assets.upload('image', createReadStream(file), { filename: basename(file) })
  posters.push({ _key: key(basename(file)), _type: 'image', asset: { _type: 'reference', _ref: asset._id }, alt: artwork.alt })
}

const transaction = client
  .transaction()
  .createIfNotExists({ _id: 'weekly', _type: 'weekly', posters })
  .createIfNotExists({
    _id: 'ticketsPage',
    _type: 'ticketsPage',
    intro: pages.tickets.intro,
    ...(pages.tickets.partner ? { partner: pages.tickets.partner } : {}),
    ...(pages.tickets.prices ? { prices: pages.tickets.prices } : {}),
  })
  .createIfNotExists({ _id: 'birthdaysPage', _type: 'birthdaysPage', intro: pages.birthdays.intro })
  .createIfNotExists({ _id: 'boothsPage', _type: 'boothsPage', intro: pages.booths.intro })
  .createIfNotExists({
    _id: 'faqPage',
    _type: 'faqPage',
    items: faq.map((item) => ({
      _key: key(item.question),
      _type: 'faqItem',
      question: item.question,
      ...(item.answer ? { answer: item.answer } : {}),
      ...(item.pending ? { pending: item.pending } : {}),
      ...(item.link ? { link: { label: item.link.label, to: item.link.to } } : {}),
    })),
  })
  .createIfNotExists({
    _id: 'settings',
    _type: 'settings',
    ...(brand.contact.email ? { email: brand.contact.email } : {}),
    ...(brand.contact.instagram ? { instagram: brand.contact.instagram } : {}),
    gettingThere: gettingThere.map((way) => ({ _key: key(way.label), _type: 'way', label: way.label, text: way.text })),
  })

for (const artist of artists) {
  transaction.createIfNotExists({
    _id: `act-${artist.slug}`,
    _type: 'act',
    name: artist.name,
    slug: { _type: 'slug', current: artist.slug },
    from: artist.from,
    bio: artist.bio,
    ...(artist.mix ? { mix: artist.mix } : {}),
    ...(artist.links?.length
      ? { links: artist.links.map((link) => ({ _key: key(link.label), _type: 'link', label: link.label, url: link.url })) }
      : {}),
  })
}

const result = await transaction.commit()
// After the posters are in, so the new Saturdays wear them.
const added = await addComingSaturdays(client)
console.log(
  `Done: ${result.results.length} documents checked (any that were already there are unchanged), and ${added} coming Saturdays added to Coming up.`,
)
