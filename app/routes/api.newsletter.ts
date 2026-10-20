import { data } from 'react-router'
import type { Route } from './+types/api.newsletter'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Klaviyo's API revision: the date-stamped version of its API this code was written against. */
const KLAVIYO_REVISION = '2026-10-15'

/**
 * Adds the address to the Klaviyo list (KLAVIYO_PRIVATE_API_KEY and KLAVIYO_LIST_ID), with email marketing
 * consent. If the list uses double opt-in, Klaviyo sends the confirmation email itself.
 */
async function subscribeInKlaviyo(email: string, key: string, list: string) {
  const response = await fetch('https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs', {
    method: 'POST',
    headers: {
      Authorization: `Klaviyo-API-Key ${key}`,
      revision: KLAVIYO_REVISION,
      'Content-Type': 'application/vnd.api+json',
      Accept: 'application/vnd.api+json',
    },
    body: JSON.stringify({
      data: {
        type: 'profile-subscription-bulk-create-job',
        attributes: {
          custom_source: 'Club Casa website',
          profiles: {
            data: [
              {
                type: 'profile',
                attributes: { email, subscriptions: { email: { marketing: { consent: 'SUBSCRIBED' } } } },
              },
            ],
          },
        },
        relationships: { list: { data: { type: 'list', id: list } } },
      },
    }),
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) throw new Error(`Klaviyo responded ${response.status}: ${await response.text()}`)
}

/**
 * Mailing-list sign-up: to Klaviyo when it's connected, and/or as JSON to NEWSLETTER_WEBHOOK_URL (Mailchimp,
 * Zapier, Make or your own endpoint). It's done if either took it.
 */
export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData()
  const email = String(form.get('email') ?? '').trim()
  if (!EMAIL.test(email) || email.length > 254) {
    return data({ ok: false, message: 'Enter a valid email address.' }, { status: 400 })
  }

  const sends: Promise<unknown>[] = []
  const key = process.env.KLAVIYO_PRIVATE_API_KEY?.trim()
  const list = process.env.KLAVIYO_LIST_ID?.trim()
  if (key && list) sends.push(subscribeInKlaviyo(email, key, list))
  const webhook = process.env.NEWSLETTER_WEBHOOK_URL
  if (webhook) {
    sends.push(
      fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'website', subscribedAt: new Date().toISOString() }),
      }).then((response) => {
        if (!response.ok) throw new Error(`Newsletter webhook responded ${response.status}`)
      }),
    )
  }
  if (!sends.length) {
    console.warn('Newsletter sign-up received, but neither Klaviyo nor NEWSLETTER_WEBHOOK_URL is set.')
    return data({ ok: false, message: 'Sign-up isn’t connected yet. Please try again soon.' }, { status: 503 })
  }

  const results = await Promise.allSettled(sends)
  for (const result of results) if (result.status === 'rejected') console.error(result.reason)
  if (!results.some((result) => result.status === 'fulfilled')) {
    return data({ ok: false, message: 'Something went wrong. Please try again.' }, { status: 502 })
  }
  return { ok: true, message: 'You’re on the list.' }
}
