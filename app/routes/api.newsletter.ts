import { data } from 'react-router'
import type { Route } from './+types/api.newsletter'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Newsletter sign-up. Forwards the address as JSON to NEWSLETTER_WEBHOOK_URL, which can be a Klaviyo, Mailchimp,
 * Zapier or Make webhook, or any endpoint of your own.
 */
export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData()
  const email = String(form.get('email') ?? '').trim()
  if (!EMAIL.test(email) || email.length > 254) {
    return data({ ok: false, message: 'Enter a valid email address.' }, { status: 400 })
  }

  const webhook = process.env.NEWSLETTER_WEBHOOK_URL
  if (!webhook) {
    console.warn('Newsletter sign-up received, but NEWSLETTER_WEBHOOK_URL is not set.')
    return data({ ok: false, message: 'Sign-up isn’t connected yet. Please try again soon.' }, { status: 503 })
  }

  try {
    const response = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, source: 'website', subscribedAt: new Date().toISOString() }),
    })
    if (!response.ok) throw new Error(`Newsletter webhook responded ${response.status}`)
  } catch (error) {
    console.error(error)
    return data({ ok: false, message: 'Something went wrong. Please try again.' }, { status: 502 })
  }

  return { ok: true, message: 'You’re on the list.' }
}
