import { data, Link } from 'react-router'
import type { Route } from './+types/artist'
import { Mark } from '../components/Mark'
import { NightRow } from '../components/NightRow'
import { PlayOnRadio } from '../components/Radio'
import { RouteError } from '../components/RouteError'
import { getArtist } from '../content/content.server'
import type { RouteHandle } from '../lib/mood'
import { requestNow } from '../lib/nightOf'
import { seo } from '../lib/seo'

export const handle: RouteHandle = { mood: 'charcoal' }

export async function loader({ params, request }: Route.LoaderArgs) {
  const found = await getArtist(params.slug, requestNow(request))
  if (!found) throw data('Artist not found', { status: 404 })
  return found
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return seo({ title: 'Not found' })
  const { artist } = loaderData
  return seo({ title: artist.name, description: `${artist.name} at Club Casa. ${artist.bio}` })
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
        <Link to="/nights" className="text-link back-link" viewTransition>
          ← All nights
        </Link>
        <div className="artist-portrait">
          {artist.photo ? (
            <img src={artist.photo} alt={artist.name} />
          ) : (
            <span className="record-art" aria-hidden>
              <Mark name="submark" className="record-art-label" />
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
          <p className="mono">No nights announced yet. Get on the list to hear first.</p>
        )}
      </section>
    </>
  )
}
