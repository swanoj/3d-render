/*
 * Fills a new back office with what the site already says: the FAQs, the venue and contact details, and the acts in
 * app/content. Run it once, after `npx sanity login`:
 *
 *   npm run seed
 *
 * It only creates what isn't there yet, so running it again never overwrites the team's edits.
 */
import { getCliClient } from 'sanity/cli'
import { brand } from '../app/brand/brand'
import { artists } from '../app/content/artists'
import { faq, gettingThere } from '../app/content/faq'

const client = getCliClient({ apiVersion: '2025-02-19' })
const key = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48)

const transaction = client
  .transaction()
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
console.log(`Done: ${result.results.length} documents checked. Any that were already there are unchanged.`)
