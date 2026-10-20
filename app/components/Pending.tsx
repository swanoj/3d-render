import type { ReactNode } from 'react'

/**
 * A detail that isn't confirmed yet (a price, a policy, the contact email), marked so nobody mistakes it for the real
 * thing. Fill the detail in (brand.ts, content/) and the placeholder goes away.
 */
export function Pending({ children, tag = 'To be confirmed' }: { children: ReactNode; tag?: string }) {
  return (
    <span className="pending">
      <span className="pending-tag">{tag}</span>
      <span className="pending-text">{children}</span>
    </span>
  )
}
