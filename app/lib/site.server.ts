/*
 * The site's address and the services it reports to, from environment variables:
 *
 *   SITE_URL                   The real public address, e.g. https://clubcasa.com.au. Canonical links, the sitemap
 *                              and structured data use it, and any other host (previews, share copies) asks search
 *                              engines not to index it. Without it, pages use the address they were requested on.
 *   GA_MEASUREMENT_ID          Google Analytics 4 measurement ID (G-…). Without it, Google Analytics stays off.
 *   GOOGLE_SITE_VERIFICATION   The content of Search Console's HTML-tag verification.
 *   BING_SITE_VERIFICATION     The content of Bing Webmaster Tools' msvalidate.01 tag.
 */

export interface SiteConfig {
  /** Origin for canonical and absolute links, without a trailing slash. */
  origin: string
  /** False on any host other than SITE_URL's, so copies of the site stay out of search results. */
  indexable: boolean
  googleAnalyticsId: string | null
  verification: { google: string | null; bing: string | null }
}

function configuredUrl() {
  const value = process.env.SITE_URL?.trim()
  if (!value) return null
  try {
    return new URL(value)
  } catch {
    console.error(`SITE_URL is not a valid address: ${value}`)
    return null
  }
}

/** The origin canonical links point at: SITE_URL when it's set, otherwise the one the request came in on. */
export function siteOrigin(request: Request) {
  return (configuredUrl() ?? new URL(request.url)).origin
}

export function siteConfig(request: Request): SiteConfig {
  const canonical = configuredUrl()
  const gaId = process.env.GA_MEASUREMENT_ID?.trim() ?? ''
  return {
    origin: siteOrigin(request),
    indexable: !canonical || new URL(request.url).host === canonical.host,
    // The ID goes into an inline script, so only a well-formed one is used.
    googleAnalyticsId: /^G-[A-Z0-9]+$/.test(gaId) ? gaId : null,
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION?.trim() || null,
      bing: process.env.BING_SITE_VERIFICATION?.trim() || null,
    },
  }
}
