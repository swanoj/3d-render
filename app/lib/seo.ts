import { brand } from '../brand/brand'
import { site, type SiteCopy } from '../content/site'

/** A page's title: "Tickets | Club Casa", or for the home page, the name and the tagline. */
export function pageTitle(title?: string, tagline = site.tagline) {
  return title ? `${title} | ${brand.name}` : `${brand.name} | ${tagline.replace('.', '')}`
}

/** The shared words (from the root loader, as the back office has them) for a route's `meta` export. */
export function siteCopy(matches: readonly ({ id: string; loaderData?: unknown } | undefined)[]): SiteCopy {
  const root = matches.find((match) => match?.id === 'root')?.loaderData as { copy?: SiteCopy } | undefined
  return root?.copy ?? site
}

/** Title, description and social-card tags for a route's `meta` export. */
export function seo(copy: SiteCopy, { title, description }: { title?: string; description?: string } = {}) {
  const fullTitle = pageTitle(title, copy.tagline)
  const summary = description ?? copy.description
  return [
    { title: fullTitle },
    { name: 'description', content: summary },
    { property: 'og:title', content: fullTitle },
    { property: 'og:description', content: summary },
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: brand.name },
    { name: 'twitter:card', content: 'summary_large_image' },
  ]
}
