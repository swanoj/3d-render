import { Link } from 'react-router'
import type { Route } from './+types/birthdays'
import { brand } from '../brand/brand'
import { EnquiryForm } from '../components/EnquiryForm'
import { Offers } from '../components/Offers'
import { PageHero } from '../components/PageHero'
import { Pending } from '../components/Pending'
import { Scribble } from '../components/Scribble'
import { getEnquiry, getPage, getSaturdays } from '../content/content.server'
import { requestNow } from '../lib/nightOf'
import { seo, siteCopy } from '../lib/seo'

export function meta({ matches }: Route.MetaArgs) {
  const copy = siteCopy(matches)
  return seo(copy, {
    title: 'Birthdays',
    description: `Celebrate your birthday at ${brand.name}. Send a birthday enquiry for any Saturday at the ${copy.venue.host}.`,
  })
}

export async function loader({ request }: Route.LoaderArgs) {
  const [saturdays, page, form] = await Promise.all([
    getSaturdays(requestNow(request)),
    getPage('birthdays'),
    getEnquiry('birthday'),
  ])
  return { saturdays, page, form }
}

export default function Birthdays({ loaderData }: Route.ComponentProps) {
  const { page, form } = loaderData
  const { packages } = page
  return (
    <>
      <PageHero
        label={page.label}
        title="Birthdays"
        intro={page.intro}
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
            {form.title}
          </h2>
          <EnquiryForm kind="birthday" enquiry={form} saturdays={loaderData.saturdays} />
        </div>
      </section>
    </>
  )
}
