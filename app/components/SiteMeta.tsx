import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { MarketingTags } from './MarketingTags'
import { useLocation, useMatches } from 'react-router'
import { site as ownCopy, type ShareImage, type SiteCopy } from '../content/site'
import type { SiteConfig } from '../lib/site.server'
import { homeJsonLd, type Contact } from '../lib/structuredData'

/** A page's own share picture (an event's poster, say): a loader can return one as `shareImage`. */
function useShareImage(fallback: ShareImage) {
  const matches = useMatches()
  for (let i = matches.length - 1; i >= 0; i--) {
    const image = (matches[i].loaderData as { shareImage?: ShareImage } | undefined)?.shareImage
    if (image?.src) return image
  }
  return fallback
}

function JsonLd({ data }: { data: unknown }) {
  // Escaped so nothing in the data can close the script tag.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />
}

/**
 * Google Analytics 4. Page views come from GA's own tracking of address changes (enhanced measurement, on by
 * default), so navigating between pages counts without extra code. Consent defaults allow measurement only: no
 * advertising cookies or ad personalisation.
 */
function GoogleAnalytics({ id }: { id: string }) {
  const setup = [
    'window.dataLayer=window.dataLayer||[];',
    'function gtag(){dataLayer.push(arguments)}',
    'window.gtag=gtag;',
    "gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'granted'});",
    "gtag('js',new Date());",
    `gtag('config',${JSON.stringify(id)});`,
  ].join('')
  return (
    <>
      <script async src={`https://www.googletagmanager.com/gtag/js?id=${id}`} />
      <script dangerouslySetInnerHTML={{ __html: setup }} />
    </>
  )
}

/**
 * Tags every page shares, in the document head: the canonical address, the share picture, whether search engines
 * may index this host, site verification, the home page's structured data, Google Analytics, and Tag Manager and
 * the ad pixels.
 */
export function SiteHead({ site }: { site?: SiteConfig & { contact?: Contact; copy?: SiteCopy } }) {
  const { pathname } = useLocation()
  // Unless the page has its own: the share picture from the back office (About Club Casa), or the site's.
  const image = useShareImage(site?.copy?.shareImage ?? ownCopy.shareImage)
  if (!site) return null
  const canonical = `${site.origin}${pathname}`
  const imageUrl = new URL(image.src, site.origin).href
  return (
    <>
      <link rel="canonical" href={canonical} />
      <meta property="og:url" content={canonical} />
      <meta property="og:locale" content="en_AU" />
      <meta property="og:image" content={imageUrl} />
      {image.width && <meta property="og:image:width" content={String(image.width)} />}
      {image.height && <meta property="og:image:height" content={String(image.height)} />}
      <meta property="og:image:alt" content={image.alt} />
      <meta name="twitter:image" content={imageUrl} />
      <meta name="twitter:image:alt" content={image.alt} />
      {!site.indexable && <meta name="robots" content="noindex, nofollow" />}
      {site.verification.google && <meta name="google-site-verification" content={site.verification.google} />}
      {site.verification.bing && <meta name="msvalidate.01" content={site.verification.bing} />}
      {pathname === '/' && <JsonLd data={homeJsonLd(site.origin, site.copy ?? ownCopy, site.contact)} />}
      {site.googleAnalyticsId && <GoogleAnalytics id={site.googleAnalyticsId} />}
      <MarketingTags tags={site.tags} googleAnalytics={Boolean(site.googleAnalyticsId)} />
    </>
  )
}

/** The route's pattern for Vercel's dashboards, so every event page counts as /events/[slug]. */
function useRoutePattern() {
  const matches = useMatches()
  const { pathname } = useLocation()
  let route = pathname
  for (const [key, value] of Object.entries(matches.at(-1)?.params ?? {})) {
    if (value) route = route.replace(`/${value}`, key === '*' ? '/[...path]' : `/[${key}]`)
  }
  return { route, path: pathname }
}

/**
 * Vercel Web Analytics (visits) and Speed Insights (Core Web Vitals from real visitors). Both send nothing until
 * they're switched on in the Vercel project, and only log to the console in development.
 */
export function SiteAnalytics() {
  const { route, path } = useRoutePattern()
  return (
    <>
      <Analytics framework="react-router" route={route} path={path} />
      <SpeedInsights route={route} />
    </>
  )
}
