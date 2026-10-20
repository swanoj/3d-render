/*
 * The site's address and the services it reports to, from environment variables:
 *
 *   SITE_URL                   The real public address, e.g. https://clubcasa.com.au. Canonical links, the sitemap
 *                              and structured data use it, and any other host (previews, share copies) asks search
 *                              engines not to index it. Without it, pages use the address they were requested on.
 *   GA_MEASUREMENT_ID          Google Analytics 4 measurement ID (G-…). Without it, Google Analytics stays off.
 *   GOOGLE_SITE_VERIFICATION   The content of Search Console's HTML-tag verification.
 *   BING_SITE_VERIFICATION     The content of Bing Webmaster Tools' msvalidate.01 tag.
 *
 * Tag Manager and the ad platforms (paste each ID from its platform; leave a variable out and that tag stays off):
 *
 *   GTM_CONTAINER_ID           Google Tag Manager container (GTM-…), for anything managed there.
 *   GOOGLE_ADS_ID              Google Ads tag (AW-…), for remarketing audiences. Conversions come from importing
 *                              GA's key events into Google Ads, or from tags in Tag Manager.
 *   META_PIXEL_ID              Meta Pixel (Facebook and Instagram ads): the number in Meta Events Manager.
 *   TIKTOK_PIXEL_ID            TikTok Pixel: the ID in TikTok Events Manager.
 *   AD_CONSENT                 Google's advertising consent once any of those is set: granted unless this is
 *                              'denied'. With none of them set it stays denied, as before.
 */

export interface SiteConfig {
  /** Origin for canonical and absolute links, without a trailing slash. */
  origin: string
  /** False on any host other than SITE_URL's, so copies of the site stay out of search results. */
  indexable: boolean
  googleAnalyticsId: string | null
  verification: { google: string | null; bing: string | null }
  /** Tag Manager and the ad platforms' tags: each null until its ID is set. */
  tags: {
    gtm: string | null
    googleAds: string | null
    metaPixel: string | null
    tiktokPixel: string | null
    /** Google's advertising consent: granted when any of the tags above is set, unless AD_CONSENT is 'denied'. */
    adConsent: boolean
  }
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

const warned = new Set<string>()

/** A tag's ID from the environment, if it's well formed. It goes into an inline script, so nothing else is used. */
function tagId(name: string, pattern: RegExp) {
  const value = process.env[name]?.trim().toUpperCase()
  if (!value) return null
  if (pattern.test(value)) return value
  if (!warned.has(name)) {
    warned.add(name)
    console.error(`${name} doesn't look like an ID from that platform (${value}), so its tag stays off.`)
  }
  return null
}

/** The origin canonical links point at: SITE_URL when it's set, otherwise the one the request came in on. */
export function siteOrigin(request: Request) {
  return (configuredUrl() ?? new URL(request.url)).origin
}

export function siteConfig(request: Request): SiteConfig {
  const canonical = configuredUrl()
  const gaId = process.env.GA_MEASUREMENT_ID?.trim() ?? ''
  const tags = {
    gtm: tagId('GTM_CONTAINER_ID', /^GTM-[A-Z0-9]{4,12}$/),
    googleAds: tagId('GOOGLE_ADS_ID', /^AW-\d{6,14}$/),
    metaPixel: tagId('META_PIXEL_ID', /^\d{8,20}$/),
    tiktokPixel: tagId('TIKTOK_PIXEL_ID', /^[A-Z0-9]{10,32}$/),
  }
  const advertising = Object.values(tags).some(Boolean)
  return {
    origin: siteOrigin(request),
    indexable: !canonical || new URL(request.url).host === canonical.host,
    // The ID goes into an inline script, so only a well-formed one is used.
    googleAnalyticsId: /^G-[A-Z0-9]+$/.test(gaId) ? gaId : null,
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION?.trim() || null,
      bing: process.env.BING_SITE_VERIFICATION?.trim() || null,
    },
    tags: { ...tags, adConsent: advertising && process.env.AD_CONSENT?.trim().toLowerCase() !== 'denied' },
  }
}
