import { Link } from 'react-router'
import type { Route } from './+types/faqs'
import { brand } from '../brand/brand'
import { Mark } from '../components/Mark'
import { PageHero } from '../components/PageHero'
import { Pending } from '../components/Pending'
import { getGuide, getPage } from '../content/content.server'
import type { FaqItem } from '../content/faq'
import { seo, siteCopy } from '../lib/seo'

export function meta({ loaderData, matches }: Route.MetaArgs) {
  return [
    ...seo(siteCopy(matches), {
      title: 'FAQs',
      description: `Answers about ${brand.name}: opening hours, tickets, entry, birthdays, booths and joining the team.`,
    }),
    ...(loaderData ? [{ 'script:ld+json': faqJsonLd(loaderData.faq) }] : []),
  ]
}

export async function loader() {
  const [{ faq }, page] = await Promise.all([getGuide(), getPage('faqs')])
  return { faq, page }
}

/** schema.org FAQ data for the answered questions, so search engines can answer them directly. */
function faqJsonLd(faq: FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq
      .filter((item) => item.answer)
      .map(({ question, answer }) => ({
        '@type': 'Question',
        name: question,
        acceptedAnswer: { '@type': 'Answer', text: answer },
      })),
  }
}

export default function Faqs({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <PageHero
        label={loaderData.page.label}
        title="FAQs"
        intro={loaderData.page.intro}
        mark="emblem"
      />

      <section className="surface surface--cream block faq-block" aria-labelledby="faq-title">
        <h2 id="faq-title" className="visually-hidden">
          Frequently asked questions
        </h2>
        <div className="faq">
          {loaderData.faq.map((item) => (
            <details key={item.question}>
              <summary>{item.question}</summary>
              <div className="faq-answer">
                {item.answer && <p className="mono">{item.answer}</p>}
                {item.pending && (
                  <p className="mono">
                    <Pending>{item.pending}</Pending>
                  </p>
                )}
                {item.link && (
                  <Link to={item.link.to} className="text-link" viewTransition>
                    {item.link.label} →
                  </Link>
                )}
              </div>
            </details>
          ))}
        </div>
        <div className="faq-more">
          <Mark name="mascot" className="faq-mascot" />
          <p className="mono">
            Still wondering?{' '}
            <Link to="/contact" className="text-link" viewTransition>
              Contact us
            </Link>
          </p>
        </div>
      </section>
    </>
  )
}
