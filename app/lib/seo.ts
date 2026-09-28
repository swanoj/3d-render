import { brand, pageTitle } from '../brand/brand'

/** Title, description and social-card tags for a route's `meta` export. */
export function seo({ title, description }: { title?: string; description?: string } = {}) {
  const fullTitle = pageTitle(title)
  const summary = description ?? brand.description
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
