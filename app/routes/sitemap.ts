import type { Route } from './+types/sitemap'
import { artists } from '../content/artists'
import { getNights } from '../content/content.server'
import { requestNow } from '../lib/nightOf'
import { eventPath } from '../lib/paths'
import { siteOrigin } from '../lib/site.server'

const PAGES = ['/', '/events', '/tickets', '/birthdays', '/booths', '/faqs', '/contact', '/careers']

const escapeXml = (text: string) =>
  text.replace(/[<>&'"]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char] ?? char)

/** Every page worth finding: the main pages, each coming and announced past night, and each act's page. */
export async function loader({ request }: Route.LoaderArgs) {
  const origin = siteOrigin(request)
  const { upcoming, past } = await getNights(requestNow(request))
  const paths = [
    ...PAGES,
    ...[...upcoming, ...past].map(eventPath),
    ...artists.map((artist) => `/artists/${artist.slug}`),
  ]
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...paths.map((path) => `  <url><loc>${escapeXml(`${origin}${path}`)}</loc></url>`),
    '</urlset>',
    '',
  ].join('\n')
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  })
}
