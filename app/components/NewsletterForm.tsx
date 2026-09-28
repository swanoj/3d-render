import { useFetcher } from 'react-router'
import type { action } from '../routes/api.newsletter'

/** Email sign-up. Posts to /api/newsletter without leaving the page. */
export function NewsletterForm({ id }: { id: string }) {
  const fetcher = useFetcher<typeof action>()
  const busy = fetcher.state !== 'idle'
  const result = fetcher.data

  return (
    <fetcher.Form method="post" action="/api/newsletter" className="newsletter-form">
      <label htmlFor={id} className="visually-hidden">
        Email address
      </label>
      <input id={id} name="email" type="email" required autoComplete="email" placeholder="Email address" />
      <button type="submit" className="button button--primary" disabled={busy}>
        {busy ? 'Joining…' : 'Sign up'}
      </button>
      <p className="form-status" role="status" data-ok={result?.ok || undefined}>
        {result?.message}
      </p>
    </fetcher.Form>
  )
}
