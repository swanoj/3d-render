import { useRouteLoaderData } from 'react-router'
import { brand } from '../brand/brand'
import { site } from '../content/site'
import type { loader } from '../root'

/** The root loader's data: the site's address, analytics settings, contact details and shared words. */
export function useSite() {
  return useRouteLoaderData<typeof loader>('root')
}

/** The contact email and Instagram handle, from the back office (or brand.ts); null until they're confirmed. */
export function useContact() {
  return useSite()?.contact ?? brand.contact
}

/** The words and details every page shares (content/site.ts), as the back office has them. */
export function useCopy() {
  return useSite()?.copy ?? site
}
