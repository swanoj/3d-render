import { brand } from '../brand/brand'
import { EnquiryForm } from '../components/EnquiryForm'
import { EventArt } from '../components/EventCard'
import { PageHero } from '../components/PageHero'
import { casaWasHere } from '../content/artwork'
import { seo } from '../lib/seo'

export function meta() {
  return seo({
    title: 'Join the team',
    description: `Work with ${brand.name}: promoters, hosts and everyone who makes the night. Apply online.`,
  })
}

/** The kinds of people the brief asks to hear from. */
const ROLES = [
  { title: 'Promoters', text: 'Bring your crowd and help spread the word about the night.' },
  { title: 'Hosts', text: 'Welcome people in and help look after the room.' },
  { title: 'Something else', text: 'Want to be part of the team in another way? Tell us what you do.' },
]

export default function Careers() {
  return (
    <>
      <PageHero
        label="Careers"
        title="Join the team"
        intro="Club Casa is made by the people who run the night. If you’d like to promote, host or be part of the team another way, we’d love to hear from you."
      />

      <section className="surface surface--charcoal block careers" aria-labelledby="roles-title">
        <div className="careers-art">
          <EventArt artwork={casaWasHere} sizes="(max-width: 860px) 80vw, 34vw" />
        </div>
        <div className="careers-roles">
          <h2 id="roles-title" className="label block-label">
            Who we’re looking for
          </h2>
          <ul className="role-list">
            {ROLES.map((role) => (
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
            Apply
          </h2>
          <EnquiryForm kind="careers" />
        </div>
      </section>
    </>
  )
}
