import { redirect } from 'react-router'
import type { Route } from './+types/legacy'

/** v1 paths: /nights became /events, and /info's answers moved to /faqs. */
export function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url)
  const path = url.pathname.replace(/\/+$/, '')
  const target = path === '/info' ? '/faqs' : path.replace(/^\/nights/, '/events')
  return redirect(`${target}${url.search}${path === '/info' ? '' : url.hash}`, 301)
}
