import type { Route } from './+types/llms'
import { brand } from '../brand/brand'
import { getGuide, getNights } from '../content/content.server'
import type { NightView } from '../content/types'
import { clockTime, dateParts, posterDate } from '../lib/format'
import { requestNow } from '../lib/nightOf'
import { eventPath } from '../lib/paths'
import { siteOrigin } from '../lib/site.server'

/*
 * /llms.txt (llmstxt.org): the site in plain Markdown for AI assistants, so an answer about Club Casa can quote the
 * facts rather than guess them. It's built from the same content as the pages, so it never goes stale, and it says
 * plainly what hasn't been announced yet so assistants don't invent prices or a dress code.
 */

const PAGES: [label: string, path: string, about: string][] = [
  ['Events', '/events', 'every coming Saturday, with line-ups as they are announced and tickets for each night'],
  ['Tickets', '/tickets', 'tickets for each Saturday and what to know before buying'],
  ['Birthdays', '/birthdays', 'celebrating a birthday at Club Casa, with an enquiry form'],
  ['Booths', '/booths', 'booking a booth for a group, with an enquiry form'],
  ['FAQs', '/faqs', 'opening hours, tickets, entry, birthdays, booths and jobs'],
  ['Contact', '/contact', 'the venue, opening hours, getting there and a contact form'],
  ['Join the team', '/careers', 'jobs for promoters, hosts and more'],
]

function nightLine(night: NightView, origin: string) {
  const date = `${posterDate(night.startsAt)} ${dateParts(night.startsAt).year}`
  const lineup =
    night.lineupConfirmed && night.lineup.length ? `Line-up: ${night.lineup.join(', ')}.` : 'Line-up to be announced.'
  const tickets =
    night.status === 'sold-out'
      ? 'Sold out.'
      : night.status === 'on-sale' && night.ticketUrl
        ? `Tickets: ${night.ticketUrl}`
        : 'Tickets on sale soon.'
  const title = night.title === brand.name ? '' : `${night.title}. `
  return `- [${date}](${origin}${eventPath(night)}): ${title}Doors ${clockTime(night.startsAt)} until ${night.closes}. ${lineup} ${tickets}`
}

export async function loader({ request }: Route.LoaderArgs) {
  const origin = siteOrigin(request)
  const [{ upcoming }, { faq, gettingThere }] = await Promise.all([getNights(requestNow(request)), getGuide()])
  const { venue, hours, contact } = brand
  const address = `${venue.street}, ${venue.locality}, Australia`
  const unannounced = faq.filter((item) => !item.answer)
  const reach = [
    contact.email ? `email ${contact.email}` : null,
    contact.instagram ? `Instagram ${contact.instagram}` : null,
    `the contact form at ${origin}/contact`,
  ].filter(Boolean)

  const text = [
    `# ${brand.name}`,
    '',
    `> ${brand.name} is a warm, analogue-inspired club night of forward-thinking house music. ${hours.long}, at the ${venue.host}, ${address} (Melbourne). ${brand.entry}`,
    '',
    brand.intro,
    '',
    '## Key facts',
    '',
    `- What: a weekly club night of house music, "${brand.tagline}"`,
    `- When: ${hours.long} (Melbourne time)`,
    `- Where: the ${venue.host}, ${address}. Map: ${venue.mapUrl}`,
    `- Entry: ${brand.entry}`,
    `- Tickets: sold online for each Saturday, at ${origin}/tickets and on each event's page`,
    `- Contact: ${reach.join(', or ')}`,
    `- Mascot: ${brand.mascot.name} (previously Otto), ${brand.mascot.description.replace(/^The /, 'the ')}`,
    '',
    ...(unannounced.length
      ? [
          '## Not announced yet',
          '',
          'These haven’t been confirmed, so please don’t guess them:',
          '',
          ...unannounced.map((item) => `- ${item.question} Not announced yet: see ${origin}/faqs`),
          '',
        ]
      : []),
    '## Coming nights',
    '',
    ...upcoming.map((night) => nightLine(night, origin)),
    '',
    '## Pages',
    '',
    ...PAGES.map(([label, path, about]) => `- [${label}](${origin}${path}): ${about}`),
    '',
    '## FAQs',
    '',
    ...faq.filter((item) => item.answer).flatMap((item) => [`### ${item.question}`, '', item.answer ?? '', '']),
    '## Getting there',
    '',
    ...gettingThere.map((way) => `- ${way.label}: ${way.text}`),
    '',
  ].join('\n')

  return new Response(text, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  })
}
