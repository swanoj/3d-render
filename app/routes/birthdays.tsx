import { Link } from 'react-router'
import type { Route } from './+types/birthdays'
import { brand } from '../brand/brand'
import { EnquiryForm } from '../components/EnquiryForm'
import { Offers } from '../components/Offers'
import { PageHero } from '../components/PageHero'
import { Pending } from '../components/Pending'
import { Scribble } from '../components/Scribble'
import { getPage, getSaturdays } from '../content/content.server'
import { requestNow } from '../lib/nightOf'
import { seo } from '../lib/seo'

export function meta() {
  return seo({
    title: 'Birthdays',
    description: `Celebrate your birthday at ${brand.name}. Send a birthday enquiry for any Saturday at the ${brand.venue.host}.`,
  })
}

export async function loader({ request }: Route.LoaderArgs) {
  const [saturdays, page] = await Promise.all([getSaturdays(requestNow(request)), getPage('birthdays')])
  return { saturdays, page }
}

export default function Birthdays({ loaderData }: Route.ComponentProps) {
  const { packages } = loaderData.page
  return (
    <>
      <PageHero
        label="Celebrate at Club Casa"
        title="Birthdays"
        intro={loaderData.page.intro}
        mark="mascot"
      />

      <section className="surface surface--cream block enquiry-layout" aria-labelledby="birthday-form-title">
        <aside className="enquiry-aside">
          <h2 className="hand enquiry-aside-title">
            Packages
            <Scribble kind="underline" className="enquiry-aside-underline" />
          </h2>
          {packages.length ? (
            <>
              <Offers offers={packages} />
              <p className="mono">Send an enquiry and we’ll come back to you with what’s available for your date.</p>
            </>
          ) : (
            <>
              <p className="mono">
                <Pending>Birthday packages and what’s included</Pending>
              </p>
              <p className="mono">
                Send an enquiry in the meantime: we’ll come back to you with what’s available for your date.
              </p>
            </>
          )}
          <ul className="enquiry-steps mono">
            <li>Pick your Saturday</li>
            <li>Tell us how many are coming</li>
            <li>We’ll be in touch</li>
          </ul>
          <p className="mono">
            Want a booth for the group?{' '}
            <Link to="/booths" className="text-link" viewTransition>
              Booths
            </Link>
          </p>
        </aside>
        <div className="enquiry-card">
          <h2 id="birthday-form-title" className="label">
            Birthday enquiry
          </h2>
          <EnquiryForm kind="birthday" saturdays={loaderData.saturdays} />
        </div>
      </section>
    </>
  )
}
