import type { Route } from './+types/careers'
import { brand } from '../brand/brand'
import { EnquiryForm } from '../components/EnquiryForm'
import { EventArt } from '../components/EventCard'
import { PageHero } from '../components/PageHero'
import { casaWasHere } from '../content/artwork'
import { getEnquiry, getPage } from '../content/content.server'
import { seo, siteCopy } from '../lib/seo'

export function meta({ matches }: Route.MetaArgs) {
  return seo(siteCopy(matches), {
    title: 'Join the team',
    description: `Work with ${brand.name}: promoters, hosts and everyone who makes the night. Apply online.`,
  })
}

export async function loader() {
  const [page, form] = await Promise.all([getPage('careers'), getEnquiry('careers')])
  return { page, form }
}

export default function Careers({ loaderData }: Route.ComponentProps) {
  const { page, form } = loaderData
  return (
    <>
      <PageHero label={page.label} title="Join the team" intro={page.intro} />

      <section className="surface surface--charcoal block careers" aria-labelledby="roles-title">
        <div className="careers-art">
          <EventArt artwork={casaWasHere} sizes="(max-width: 860px) 80vw, 34vw" />
        </div>
        <div className="careers-roles">
          <h2 id="roles-title" className="label block-label">
            Who we’re looking for
          </h2>
          <ul className="role-list">
            {page.roles.map((role) => (
              <li key={role.title}>
                <h3 className="hand role-title">{role.title}</h3>
                <p className="mono">{role.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="surface surface--cream block enquiry-layout enquiry-layout--single" aria-labelledby="apply-title">
        <div className="enquiry-card">
          <h2 id="apply-title" className="label">
            {form.title}
          </h2>
          <EnquiryForm kind="careers" enquiry={form} />
        </div>
      </section>
    </>
  )
}
