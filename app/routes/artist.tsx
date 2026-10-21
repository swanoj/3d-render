import { data, Link } from 'react-router'
import type { Route } from './+types/artist'
import { Mark } from '../components/Mark'
import { NightRow } from '../components/NightRow'
import { PlayOnRadio } from '../components/Radio'
import { RouteError } from '../components/RouteError'
import { getArtist } from '../content/content.server'
import type { RouteHandle } from '../lib/mood'
import { requestNow } from '../lib/nightOf'
import { seo, siteCopy } from '../lib/seo'
import { siteOrigin } from '../lib/site.server'
import { artistJsonLd, breadcrumbJsonLd } from '../lib/structuredData'

export const handle: RouteHandle = { mood: 'charcoal' }

export async function loader({ params, request }: Route.LoaderArgs) {
  const found = await getArtist(params.slug, requestNow(request))
  if (!found) throw data('Artist not found', { status: 404 })
  const { artist } = found
  const shareImage = artist.photo ? { src: artist.photo, alt: artist.name } : undefined
  return { ...found, origin: siteOrigin(request), shareImage }
}

export function meta({ loaderData, matches }: Route.MetaArgs) {
  const copy = siteCopy(matches)
  if (!loaderData) return seo(copy, { title: 'Not found' })
  const { artist, origin } = loaderData
  return [
    ...seo(copy, { title: artist.name, description: `${artist.name} at Club Casa. ${artist.bio}` }),
    { 'script:ld+json': artistJsonLd(artist, origin) },
    { 'script:ld+json': breadcrumbJsonLd(origin, [{ name: artist.name, path: `/artists/${artist.slug}` }]) },
  ]
}

export function ErrorBoundary() {
  return <RouteError />
}

/** An act's page: who they are, their mix on Casa Radio, their links and the nights they play. */
export default function ArtistPage({ loaderData }: Route.ComponentProps) {
  const { artist, playing, mix } = loaderData
  return (
    <>
      <section className="artist-hero" aria-labelledby="artist-name">
        <Link to="/events" className="text-link back-link" viewTransition>
          ← All events
        </Link>
        <div className="artist-portrait">
          {artist.photo ? (
            <img src={artist.photo} alt={artist.name} />
          ) : (
            <span className="record-art" aria-hidden>
              <Mark name="emblem" className="record-art-label" />
            </span>
          )}
        </div>
        <div className="artist-text">
          <p className="label">{artist.from}</p>
          <h1 id="artist-name" className="hand artist-name">
            {artist.name}
          </h1>
          <p className="mono artist-bio">{artist.bio}</p>
          <div className="button-row">
            {mix && <PlayOnRadio mix={mix} />}
            {artist.links?.map((link) => (
              <a key={link.url} className="button" href={link.url} target="_blank" rel="noreferrer">
                {link.label} ↗
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="surface surface--cream block" aria-labelledby="playing-title">
        <h2 id="playing-title" className="label block-label">
          Playing
        </h2>
        {playing.length ? (
          <ul className="night-list">
            {playing.map((night) => (
              <NightRow key={night.slug} night={night} />
            ))}
          </ul>
        ) : (
          <p className="mono">No events announced yet. Get on the list to hear first.</p>
        )}
      </section>
    </>
  )
}
