import type { RefObject } from 'react'
import type { Mix } from '../content/types'
import { casaSound } from '../lib/casaSound'
import { prefersReducedMotion } from '../lib/gsap'
import { useRadio } from '../lib/hooks'
import { useStageName, type Stage } from '../lib/walkIn'
import { Note } from './Scribble'

/* The walk in's controls, on the v2 home page (the walk itself is lib/walkIn.ts). */

/** Turns the music on (the night on top of the crate, if there is one) or off. Call it from a click. */
function toggleSound(on: boolean, record: Mix | null) {
  if (on) return casaSound.pauseRadio()
  if (record) casaSound.put(0, record)
  casaSound.playRadio()
}

function SoundIcon({ on }: { on: boolean }) {
  return (
    <svg className="sound-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" />
      {on ? (
        <g className="sound-bars" fill="currentColor">
          <rect className="sound-bar" x="14.5" y="8" width="2" height="8" rx="1" />
          <rect className="sound-bar" x="18" y="6" width="2" height="12" rx="1" />
        </g>
      ) : (
        <path d="M15.5 9.5l5 5m0-5l-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      )}
    </svg>
  )
}

/** The hero's invitation in: put the sound on and walk down the page. */
export function WalkInButton({ record, stage }: { record: Mix | null; stage: Stage }) {
  const radio = useRadio()
  const name = useStageName()
  return (
    <div className="walk-start">
      <button type="button" className="walk-button" aria-pressed={radio.on} onClick={() => toggleSound(radio.on, record)}>
        <SoundIcon on={radio.on} />
        <span>{radio.on ? `Sound on · ${name(stage)}` : 'Step inside, with sound'}</span>
      </button>
      {!radio.on && (
        <Note className="walk-note" arrow="arrow" delay={900}>
          then scroll in
        </Note>
      )}
    </div>
  )
}

/**
 * Where you are on the way in, at the side of the screen: each place, the one you're in lit and beating with the
 * music, a click away, and the sound switch. On a phone, where the header has the sound, it's a caption instead,
 * there for a moment each time you get somewhere new.
 */
export function WalkMeter({
  stage,
  stages,
  record,
  page,
}: {
  stage: Stage
  /** The places on the page, in order. */
  stages: Stage[]
  record: Mix | null
  page: RefObject<HTMLElement | null>
}) {
  const radio = useRadio()
  const name = useStageName()

  const go = (target: Stage) => {
    const element = page.current?.querySelector<HTMLElement>(`[data-walk="${target}"]`)
    if (!element) return
    const top = target === 'street' ? 0 : element.getBoundingClientRect().top + window.scrollY
    window.scrollTo({ top, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }

  return (
    <nav className="walk-meter" aria-label="Where you are" data-street={stage === 'street' || undefined}>
      <ol className="walk-places">
        {stages.map((place) => (
          <li key={place}>
            <button type="button" className="walk-place" aria-current={place === stage ? 'location' : undefined} onClick={() => go(place)}>
              <span className="walk-dot" aria-hidden />
              <span className="walk-name">{name(place)}</span>
            </button>
          </li>
        ))}
      </ol>
      <button
        type="button"
        className="walk-sound"
        aria-pressed={radio.on}
        aria-label={radio.on ? 'Turn the sound off' : 'Turn the sound on'}
        onClick={() => toggleSound(radio.on, record)}
      >
        <SoundIcon on={radio.on} />
      </button>
      {/* Mounted afresh for each place, so its fade plays again. */}
      <p key={stage} className="walk-caption" aria-hidden>
        <span className="walk-dot" />
        {name(stage)}
      </p>
    </nav>
  )
}
