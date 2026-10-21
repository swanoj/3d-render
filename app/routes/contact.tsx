import { Link } from 'react-router'
import type { Route } from './+types/contact'
import { brand } from '../brand/brand'
import { EnquiryForm } from '../components/EnquiryForm'
import { PageHero } from '../components/PageHero'
import { VenueDetails } from '../components/VenueDetails'
import { getEnquiry, getGuide, getPage } from '../content/content.server'
import { seo, siteCopy } from '../lib/seo'
import { useCopy } from '../lib/useSite'

export function meta({ matches }: Route.MetaArgs) {
  return seo(siteCopy(matches), {
    title: 'Contact',
    description: `Get in touch with ${brand.name}: the venue, opening hours, directions and enquiries.`,
  })
}

export async function loader() {
  const [{ gettingThere }, page, form] = await Promise.all([getGuide(), getPage('contact'), getEnquiry('contact')])
  return { gettingThere, page, form }
}

const PATHS = [
  { to: '/birthdays', label: 'Birthday enquiries' },
  { to: '/booths', label: 'Booth enquiries' },
  { to: '/careers', label: 'Promoters, hosts and jobs' },
  { to: '/faqs', label: 'FAQs' },
]

export default function Contact({ loaderData }: Route.ComponentProps) {
  const { page, form } = loaderData
  const { venue } = useCopy()
  return (
    <>
      <PageHero
        label={page.label}
        title="Contact"
        intro={page.intro}
        mark="logo-mascot"
      />

      <section className="surface surface--cream block contact" aria-labelledby="contact-form-title">
        <div className="contact-info">
          <h2 className="label block-label">Club Casa</h2>
          <VenueDetails />
          <ul className="contact-paths">
            {PATHS.map((path) => (
              <li key={path.to}>
                <Link to={path.to} className="text-link" viewTransition>
                  {path.label} →
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="enquiry-card">
          <h2 id="contact-form-title" className="label">
            {form.title}
          </h2>
          <EnquiryForm kind="contact" enquiry={form} />
        </div>
      </section>

      <section className="surface surface--charcoal block" aria-labelledby="getting-there-title">
        <h2 id="getting-there-title" className="label block-label">
          Getting there
        </h2>
        <dl className="info-list">
          {loaderData.gettingThere.map((way) => (
            <div key={way.label}>
              <dt>{way.label}</dt>
              <dd>{way.text}</dd>
            </div>
          ))}
        </dl>
        <div className="button-row button-row--start contact-map">
          <a className="button button--solid" href={venue.mapUrl} target="_blank" rel="noreferrer">
            Open in Google Maps ↗
          </a>
        </div>
      </section>
    </>
  )
}
