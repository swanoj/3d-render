import { useRouteLoaderData } from 'react-router'
import { brand } from '../brand/brand'
import type { loader } from '../root'

/** The root loader's data: the site's address, analytics settings and contact details. */
export function useSite() {
  return useRouteLoaderData<typeof loader>('root')
}

/** The contact email and Instagram handle, from the back office (or brand.ts); null until they're confirmed. */
export function useContact() {
  return useSite()?.contact ?? brand.contact
}
