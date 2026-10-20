import { track as vercelTrack } from '@vercel/analytics/react'

declare global {
  interface Window {
    /** Google's tag, present when GA_MEASUREMENT_ID or GOOGLE_ADS_ID is set (see SiteHead, MarketingTags). */
    gtag?: (command: 'event', name: string, params?: Record<string, unknown>) => void
    /** Google's queue, read by Tag Manager. */
    dataLayer?: unknown[]
    /** Which tags MarketingTags put on the page. */
    casaTags?: { gtm?: boolean }
    /** The Meta Pixel, when META_PIXEL_ID is set. */
    fbq?: (command: 'track' | 'trackCustom', name: string, params?: Record<string, unknown>) => void
    /** The TikTok Pixel, when TIKTOK_PIXEL_ID is set. */
    ttq?: { track: (name: string, params?: Record<string, unknown>) => void; page: () => void }
  }
}

type EventProps = Record<string, string | number | boolean | null>

/** The same moments in each ad platform's standard events, so they can optimise for them. */
const META_EVENTS: Record<string, string> = {
  ticket_click: 'InitiateCheckout',
  generate_lead: 'Lead',
  sign_up: 'CompleteRegistration',
}
const TIKTOK_EVENTS: Record<string, string> = {
  ticket_click: 'InitiateCheckout',
  generate_lead: 'SubmitForm',
  sign_up: 'CompleteRegistration',
}

/** "add_to_calendar" as Meta writes its own events: "AddToCalendar". */
const pascal = (name: string) => name.replace(/(^|_)([a-z])/g, (_, __, letter: string) => letter.toUpperCase())

/**
 * Records a moment that matters (a ticket click, a sign-up, an enquiry) in Google Analytics and Vercel Web
 * Analytics, and in Tag Manager and the ad pixels when they're on (see MarketingTags). Names follow GA4's
 * recommended events where one fits (sign_up, generate_lead, share), so they can be marked as key events in GA as
 * they are. Tag Manager gets each as a dataLayer event of the same name, with the same details; Meta and TikTok get
 * their standard events for tickets, enquiries and sign-ups, and Meta gets the rest as custom events. Vercel keeps
 * custom events on its Pro and Enterprise plans.
 */
export function track(name: string, props: EventProps = {}) {
  window.gtag?.('event', name, props)
  if (window.casaTags?.gtm) window.dataLayer?.push({ event: name, ...props })
  const label = props.form ?? props.event ?? props.content_type ?? props.method
  const details = label == null ? {} : { content_name: String(label) }
  if (META_EVENTS[name]) window.fbq?.('track', META_EVENTS[name], details)
  else window.fbq?.('trackCustom', pascal(name), details)
  if (TIKTOK_EVENTS[name]) window.ttq?.track(TIKTOK_EVENTS[name], details)
  vercelTrack(name, props)
}
