import { useEffect } from 'react'
import { useClient, type LayoutProps } from 'sanity'
import { addComingSaturdays } from '../lib/weekly'

/**
 * Wraps the back office. Each time it opens, any coming Saturday the site lists that isn't in Coming up yet is added
 * (see lib/weekly.ts), so the two always match.
 */
export function ComingSaturdays(props: LayoutProps) {
  const client = useClient({ apiVersion: '2025-02-19' })
  useEffect(() => {
    addComingSaturdays(client).catch((error: unknown) => console.warn('Couldn’t add the coming Saturdays to Coming up.', error))
  }, [client])
  return props.renderDefault(props)
}
