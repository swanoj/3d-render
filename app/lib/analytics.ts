import { track as vercelTrack } from '@vercel/analytics/react'

declare global {
  interface Window {
    /** Google's tag, present when GA_MEASUREMENT_ID is set (see SiteHead). */
    gtag?: (command: 'event', name: string, params?: Record<string, unknown>) => void
  }
}

type EventProps = Record<string, string | number | boolean | null>

/**
 * Records a moment that matters (a ticket click, a sign-up, an enquiry) in Google Analytics and Vercel Web Analytics.
 * Names follow GA4's recommended events where one fits (sign_up, generate_lead, share), so they can be marked as key
 * events in GA as they are. Vercel keeps custom events on its Pro and Enterprise plans.
 */
export function track(name: string, props: EventProps = {}) {
  window.gtag?.('event', name, props)
  vercelTrack(name, props)
}
