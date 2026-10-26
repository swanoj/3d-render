import type { ReactNode } from 'react'
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
} from 'react-router'
import type { Route } from './+types/root'
import './app.css'
import { brand, moods } from './brand/brand'
import { Casa } from './components/Casa'
import { markUrl } from './lib/marks'
import { RadioDock } from './components/RadioDock'
import { SiteFooter } from './components/SiteFooter'
import { SiteHeader } from './components/SiteHeader'
import { SiteAnalytics, SiteHead } from './components/SiteMeta'
import { Backdrop } from './components/Stages'
import { moodCss, useRouteMood } from './lib/mood'
import { MoodProvider } from './lib/MoodProvider'
import { getContact, getSite } from './content/content.server'
import { pageTitle } from './lib/seo'
import { siteConfig } from './lib/site.server'

/**
 * The site's address and analytics settings (see lib/site.server.ts), and what every page shows: the contact details
 * and the shared words (the tagline, the venue, the hours), from the back office.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const [contact, copy] = await Promise.all([getContact(), getSite()])
  return { ...siteConfig(request), contact, copy }
}

// The settings don't change from page to page, so they're fetched once.
export function shouldRevalidate() {
  return false
}

export const links: Route.LinksFunction = () => [
  // The logo and the hand-drawn face set the first screen, so fetch them alongside the HTML.
  // CSS masks and the WebGL tile both fetch the logo in CORS mode, so the preload must match or it goes unused.
  { rel: 'preload', href: '/brand/logo.svg', as: 'image', type: 'image/svg+xml', crossOrigin: 'anonymous' },
  { rel: 'preload', href: markUrl('logo'), as: 'image', type: 'image/png', crossOrigin: 'anonymous' },
  { rel: 'preload', href: '/fonts/felt-tip-senior-regular.woff2', as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' },
  { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
]

export function Layout({ children }: { children: ReactNode }) {
  const mood = useRouteMood()
  const site = useRouteLoaderData<typeof loader>('root')
  return (
    <html lang="en-AU">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content={moods[mood].base} />
        {/* The route's colourway in the first paint; the mood provider animates it from there. */}
        <style>{moodCss(mood)}</style>
        <Meta />
        <Links />
        <SiteHead site={site} />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function App() {
  const routeMood = useRouteMood()
  return (
    <MoodProvider routeMood={routeMood}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Backdrop />
      <SiteHeader />
      <main id="main" className="site-main">
        <Outlet />
      </main>
      <SiteFooter />
      {/* Outside the pages, so the turntable keeps turning from one to the next. */}
      <RadioDock />
      {/* The mascot, walking the bottom edge of every page. */}
      <Casa />
      <SiteAnalytics />
    </MoodProvider>
  )
}

/** Last resort for errors outside any page (a page's own errors render inside the layout instead). */
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const notFound = isRouteErrorResponse(error) && error.status === 404
  if (!notFound) console.error(error)
  return (
    <main className="error-page error-page--bare">
      <title>{pageTitle(notFound ? 'Not found' : 'Error')}</title>
      <p className="label">{brand.name}</p>
      <h1 className="hand error-title">{notFound ? 'Wrong room' : 'Lights up'}</h1>
      <p className="mono">{notFound ? 'That page doesn’t exist, or it has moved.' : 'Please try again in a moment.'}</p>
      <a href="/" className="button button--solid">
        Back home
      </a>
    </main>
  )
}
