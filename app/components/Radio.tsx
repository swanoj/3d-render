import { mixes } from '../content/radio'
import type { Mix } from '../content/types'
import { casaSound } from '../lib/casaSound'
import { useRadio } from '../lib/hooks'

/** A record that spins while the radio plays. */
function RadioIcon() {
  return (
    <svg className="radio-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <circle cx="12" cy="12" r="10.5" fill="currentColor" />
      <circle cx="12" cy="12" r="7" fill="none" stroke="var(--radio-grooves, #fff)" strokeOpacity="0.25" />
      <circle cx="12" cy="12" r="3.6" fill="var(--radio-label, #e95e27)" />
      <circle cx="12" cy="12" r="0.9" fill="currentColor" />
    </svg>
  )
}

/**
 * Casa Radio in the site header, so it keeps playing from page to page: tap to play or pause, and the next mix
 * when there's more than one.
 */
export function RadioControl() {
  const { on, mix } = useRadio()
  return (
    <div className="radio" data-on={on || undefined}>
      <button
        type="button"
        className="radio-button"
        aria-label="Casa Radio"
        aria-pressed={on}
        aria-describedby={on ? 'radio-now' : undefined}
        onClick={casaSound.toggleRadio}
        title={on ? `Casa Radio: ${mix.title}, ${mix.artist}` : 'Play Casa Radio'}
      >
        <RadioIcon />
        <span className="radio-label" aria-hidden>
          {on ? 'On air' : 'Radio'}
        </span>
      </button>
      {on && (
        <span id="radio-now" className="radio-now mono">
          {mix.title} · {mix.artist}
        </span>
      )}
      {on && mixes.length > 1 && (
        <button type="button" className="radio-next" onClick={casaSound.nextMix} aria-label="Next mix">
          ⏭
        </button>
      )}
    </div>
  )
}

/** "Play on Casa Radio" for an artist's mix; pauses it again if it's the one playing. */
export function PlayOnRadio({ mix }: { mix: Mix }) {
  const radio = useRadio()
  const playing = radio.on && radio.mix.id === mix.id
  return (
    <button
      type="button"
      className="button button--solid"
      aria-pressed={playing}
      onClick={() => (playing ? casaSound.pauseRadio() : casaSound.playRadio(mix.id))}
    >
      {playing ? 'Pause Casa Radio' : 'Play on Casa Radio'}
    </button>
  )
}
