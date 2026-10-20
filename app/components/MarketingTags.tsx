import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'
import type { SiteConfig } from '../lib/site.server'

type Tags = SiteConfig['tags']

/** IDs are checked on the server (lib/site.server.ts) and quoted here, so nothing else reaches the scripts. */
const quote = (value: string) => JSON.stringify(value)

function Inline({ code }: { code: string }) {
  return <script dangerouslySetInnerHTML={{ __html: code }} />
}

/**
 * Google's queue and consent, before Tag Manager or the Google Ads tag loads. When Google Analytics is on, its own
 * setup (SiteHead) has set the defaults already, so advertising consent is only updated; otherwise it's set here.
 * gtag is shared on the page only for the Google Ads tag, so Tag Manager sees each event once.
 */
function googleSetup({ googleAds, adConsent }: Tags, googleAnalytics: boolean) {
  const ads = adConsent ? 'granted' : 'denied'
  const consent = `{ad_storage:'${ads}',ad_user_data:'${ads}',ad_personalization:'${ads}'}`
  return [
    'window.dataLayer=window.dataLayer||[];',
    // Inside a function, so gtag doesn't become a global unless the Google Ads tag needs it.
    '(function(){function gtag(){dataLayer.push(arguments)}',
    googleAnalytics
      ? adConsent
        ? `gtag('consent','update',${consent});`
        : ''
      : `gtag('consent','default',Object.assign(${consent},{analytics_storage:'granted'}));`,
    googleAds
      ? `window.gtag=window.gtag||gtag;${googleAnalytics ? '' : "gtag('js',new Date());"}gtag('config',${quote(googleAds)});`
      : '',
    '})();',
  ].join('')
}

/** Google Tag Manager's snippet, as Tag Manager gives it. */
const tagManager = (id: string) =>
  `window.casaTags=Object.assign(window.casaTags||{},{gtm:true});` +
  `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});` +
  `var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;` +
  `j.src='https://www.googletagmanager.com/gtm.js?id='+i;f.parentNode.insertBefore(j,f);` +
  `})(window,document,'script','dataLayer',${quote(id)});`

/**
 * The Meta Pixel's base code, as Events Manager gives it. Its own counting of address changes is switched off
 * (disablePushState), because PageViews below counts every page once.
 */
const metaPixel = (id: string) =>
  `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};` +
  `if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;` +
  `s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');` +
  `fbq.disablePushState=true;fbq('init',${quote(id)});fbq('track','PageView');`

/** The TikTok Pixel's base code, as Events Manager gives it. */
const tiktokPixel = (id: string) =>
  `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"];` +
  `ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};` +
  `for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);` +
  `ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};` +
  `ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=r;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};` +
  `n=document.createElement("script");n.type="text/javascript";n.async=!0;n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};` +
  `ttq.load(${quote(id)});ttq.page()}(window,document,'ttq');`

/**
 * The site doesn't reload between pages, so each page after the first is counted here, once per tag: a page_view
 * event for Tag Manager, a page view for the Google Ads tag, a Meta PageView and a TikTok page. (Google Analytics
 * counts address changes itself.)
 */
function PageViews({ tags }: { tags: Tags }) {
  const { pathname, search } = useLocation()
  const counted = useRef(pathname + search)
  useEffect(() => {
    const path = pathname + search
    if (path === counted.current) return
    counted.current = path
    const page = { page_location: window.location.href, page_path: path, page_title: document.title }
    if (tags.gtm) window.dataLayer?.push({ event: 'page_view', ...page })
    if (tags.googleAds) window.gtag?.('event', 'page_view', { ...page, send_to: tags.googleAds })
    if (tags.metaPixel) window.fbq?.('track', 'PageView')
    if (tags.tiktokPixel) window.ttq?.page()
  }, [pathname, search, tags])
  return null
}

/**
 * Google Tag Manager, the Google Ads tag, the Meta Pixel and the TikTok Pixel, in the document head, each only once
 * its ID is set in the environment (see lib/site.server.ts). The key moments (ticket clicks, enquiries, sign-ups)
 * reach every one of them through track() in lib/analytics.ts.
 */
export function MarketingTags({ tags, googleAnalytics }: { tags: Tags; googleAnalytics: boolean }) {
  if (!tags.gtm && !tags.googleAds && !tags.metaPixel && !tags.tiktokPixel) return null
  return (
    <>
      {(tags.gtm || tags.googleAds) && <Inline code={googleSetup(tags, googleAnalytics)} />}
      {tags.googleAds && !googleAnalytics && (
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${tags.googleAds}`} />
      )}
      {tags.gtm && <Inline code={tagManager(tags.gtm)} />}
      {tags.metaPixel && <Inline code={metaPixel(tags.metaPixel)} />}
      {tags.tiktokPixel && <Inline code={tiktokPixel(tags.tiktokPixel)} />}
      <PageViews tags={tags} />
    </>
  )
}
