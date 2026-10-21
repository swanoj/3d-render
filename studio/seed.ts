/*
 * Fills the back office with what the site already shows: the words every page shares, the venue and the hours, each
 * page's words, the forms' wording, the weekly posters and the coming Saturdays, the FAQs and the acts in app/content.
 * Run it after `npx sanity login`:
 *
 *   npm run seed
 *
 * It only fills in what isn't there yet (a document, or a field of one), so running it again never overwrites the
 * team's edits, and it's how new fields get their first values.
 */
import { createReadStream } from 'node:fs'
import { basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getCliClient } from 'sanity/cli'
import { brand } from '../app/brand/brand'
import { artists } from '../app/content/artists'
import { weeklyArtwork } from '../app/content/artwork'
import { enquiries, type EnquiryKind } from '../app/content/enquiries'
import { faq, gettingThere } from '../app/content/faq'
import { pages } from '../app/content/pages'
import { site } from '../app/content/site'
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

// The share picture, the same way.
const shareFile = fileURLToPath(new URL(`../public${site.shareImage.src}`, import.meta.url))
const shareAsset = await client.assets.upload('image', createReadStream(shareFile), { filename: basename(shareFile) })
const shareImage = { _type: 'image', asset: { _type: 'reference', _ref: shareAsset._id }, alt: site.shareImage.alt }

/** Each fixed document, with the site's own values for any field it hasn't got yet. */
const fixed: Record<string, { type: string; fields: Record<string, unknown> }> = {
  weekly: { type: 'weekly', fields: { doors: site.hours.opens, closes: site.hours.closes, posters } },
  about: {
    type: 'about',
    fields: { tagline: site.tagline, about: site.about, description: site.description, shareImage, newsletter: site.newsletter },
  },
  settings: {
    type: 'settings',
    fields: {
      venue: { name: site.venue.host, street: site.venue.street, suburb: site.venue.suburb, state: site.venue.state, postcode: site.venue.postcode },
      entry: site.entry,
      ...(brand.contact.email ? { email: brand.contact.email } : {}),
      ...(brand.contact.instagram ? { instagram: brand.contact.instagram } : {}),
      gettingThere: gettingThere.map((way) => ({ _key: key(way.label), _type: 'way', label: way.label, text: way.text })),
    },
  },
  homePage: { type: 'homePage', fields: { plans: pages.home.plans } },
  eventsPage: { type: 'eventsPage', fields: { intro: pages.events.intro } },
  ticketsPage: {
    type: 'ticketsPage',
    fields: {
      intro: pages.tickets.intro,
      ...(pages.tickets.partner ? { partner: pages.tickets.partner } : {}),
      ...(pages.tickets.prices ? { prices: pages.tickets.prices } : {}),
    },
  },
  birthdaysPage: { type: 'birthdaysPage', fields: { label: pages.birthdays.label, intro: pages.birthdays.intro } },
  boothsPage: { type: 'boothsPage', fields: { label: pages.booths.label, intro: pages.booths.intro } },
  faqPage: {
    type: 'faqPage',
    fields: {
      label: pages.faqs.label,
      intro: pages.faqs.intro,
      items: faq.map((item) => ({
        _key: key(item.question),
        _type: 'faqItem',
        question: item.question,
        ...(item.answer ? { answer: item.answer } : {}),
        ...(item.pending ? { pending: item.pending } : {}),
        ...(item.link ? { link: { label: item.link.label, to: item.link.to } } : {}),
      })),
    },
  },
  contactPage: { type: 'contactPage', fields: { label: pages.contact.label, intro: pages.contact.intro } },
  careersPage: {
    type: 'careersPage',
    fields: {
      label: pages.careers.label,
      intro: pages.careers.intro,
      roles: pages.careers.roles.map((role) => ({ _key: key(role.title), _type: 'role', title: role.title, text: role.text })),
    },
  },
}
for (const [kind, form] of Object.entries(enquiries) as [EnquiryKind, (typeof enquiries)[EnquiryKind]][]) {
  fixed[`form-${kind}`] = {
    type: 'enquiryForm',
    fields: {
      title: form.title,
      submit: form.submit,
      sent: form.sent,
      fields: form.fields.map((field) => ({
        _key: field.name,
        _type: 'formField',
        name: field.name,
        type: field.type,
        label: field.label,
        ...(field.placeholder ? { placeholder: field.placeholder } : {}),
        ...(field.options ? { options: field.options } : {}),
      })),
    },
  }
}

const transaction = client.transaction()
for (const [id, { type, fields }] of Object.entries(fixed)) {
  transaction.createIfNotExists({ _id: id, _type: type }).patch(id, (patch) => patch.setIfMissing(fields))
}
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

await transaction.commit()
// After Every Saturday is filled in, so the new Saturdays get its hours and posters.
const added = await addComingSaturdays(client)
console.log(
  `Done: ${Object.keys(fixed).length} pages and settings and ${artists.length} acts checked (anything already filled in is unchanged), and ${added} coming Saturdays added to Coming up.`,
)
