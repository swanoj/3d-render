import type { Route } from './+types/robots'
import { brand } from '../brand/brand'
import { getSite } from '../content/content.server'
import { siteConfig } from '../lib/site.server'

/*
 * Search engines and AI assistants are welcome: the more of them that can read the site, the better they can answer
 * "what's on in St Kilda on Saturday night?". The AI crawlers are named so the welcome is explicit, and so any of them
 * can be turned away later by changing its group to `Disallow: /`. To stay in AI search but out of model training,
 * disallow GPTBot, ClaudeBot, Google-Extended, Applebot-Extended, CCBot and meta-externalagent.
 */
const AI_CRAWLERS = [
  // Search and answers: these fetch pages to cite them in replies.
  'OAI-SearchBot',
  'ChatGPT-User',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  // Training and model improvement.
  'GPTBot',
  'ClaudeBot',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
  'meta-externalagent',
]

export async function loader({ request }: Route.LoaderArgs) {
  const site = siteConfig(request)
  const { hours, venue } = await getSite()
  const body = site.indexable
    ? [
        `# ${brand.name}: ${hours.long}, at the ${venue.host}, ${venue.suburb}.`,
        '',
        'User-agent: *',
        'Disallow: /api/',
        '',
        ...AI_CRAWLERS.map((agent) => `User-agent: ${agent}`),
        'Disallow: /api/',
        '',
        `Sitemap: ${site.origin}/sitemap.xml`,
        '',
      ].join('\n')
    : // A preview or a copy of the site: keep it out of search results entirely.
      'User-agent: *\nDisallow: /\n'
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  })
}
