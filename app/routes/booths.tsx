import { Link } from 'react-router'
import type { Route } from './+types/booths'
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
    title: 'Booths',
    description: `Booth reservations and VIP at ${brand.name}, every Saturday at the ${copy.venue.host}. Send a booth enquiry.`,
  })
}

export async function loader({ request }: Route.LoaderArgs) {
  const [saturdays, page, form] = await Promise.all([getSaturdays(requestNow(request)), getPage('booths'), getEnquiry('booth')])
  return { saturdays, page, form }
}

export default function Booths({ loaderData }: Route.ComponentProps) {
  const { page, form } = loaderData
  const { options } = page
  return (
    <>
      <PageHero
        label={page.label}
        title="Booths"
        intro={page.intro}
        mark="logo-stacked-stroke"
      />

      <section className="surface surface--cream block enquiry-layout" aria-labelledby="booth-form-title">
        <aside className="enquiry-aside">
          <h2 className="hand enquiry-aside-title">
            The booths
            <Scribble kind="underline" className="enquiry-aside-underline" />
          </h2>
          {options.length ? (
            <Offers offers={options} />
          ) : (
            <p className="mono">
              <Pending>Booth options and VIP inclusions</Pending>
            </p>
          )}
          <p className="mono">
            Booths are booked by enquiry for now. Tell us your Saturday and how many are coming and we’ll confirm what’s
            available.
          </p>
          <p className="mono">
            Celebrating something?{' '}
            <Link to="/birthdays" className="text-link" viewTransition>
              Birthdays
            </Link>
          </p>
        </aside>
        <div className="enquiry-card">
          <h2 id="booth-form-title" className="label">
            {form.title}
          </h2>
          <EnquiryForm kind="booth" enquiry={form} saturdays={loaderData.saturdays} />
        </div>
      </section>
    </>
  )
}
