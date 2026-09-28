import { Link } from 'react-router'
import { brand } from '../brand/brand'
import { Mark } from './Mark'
import { NewsletterForm } from './NewsletterForm'

export function SiteFooter() {
  const { venue } = brand
  return (
    <footer className="site-footer">
      <section id="list" className="footer-list" aria-labelledby="list-title">
        <h2 id="list-title" className="hand footer-list-title">
          {brand.newsletter.heading}
        </h2>
        <p className="mono">{brand.newsletter.body}</p>
        <NewsletterForm id="footer-email" />
      </section>

      <div className="footer-main">
        <Mark name="logo-stacked" label={brand.name} className="footer-logo" />
        <address className="mono">
          {venue.name}
          <br />
          {venue.note}
          <br />
          {venue.street}
          <br />
          {venue.locality}
        </address>
        <nav aria-label="Footer" className="footer-nav">
          <ul>
            <li>
              <Link to="/" viewTransition>
                Home
              </Link>
            </li>
            {brand.nav.map((item) => (
              <li key={item.to}>
                <Link to={item.to} viewTransition>
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <a href={venue.mapUrl} target="_blank" rel="noreferrer">
                Map ↗
              </a>
            </li>
          </ul>
        </nav>
        <p className="footer-base mono">
          © {new Date().getFullYear()} {brand.name} · {brand.entry}
        </p>
      </div>
    </footer>
  )
}
