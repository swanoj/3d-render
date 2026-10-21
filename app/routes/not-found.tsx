import { data } from 'react-router'
import type { Route } from './+types/not-found'
import { ErrorMessage } from '../components/RouteError'
import { seo, siteCopy } from '../lib/seo'

// Catch-all: renders the not-found page inside the site layout with a real 404 status.
export async function loader() {
  return data(null, { status: 404 })
}

export function meta({ matches }: Route.MetaArgs) {
  return seo(siteCopy(matches), { title: 'Not found' })
}

export default function NotFound() {
  return <ErrorMessage notFound />
}
