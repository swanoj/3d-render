import { lazy, Suspense, useState } from 'react'
import { useLocation } from 'react-router'
import { casaSound } from '../lib/casaSound'
import { useBoothOnScreen, useDesk, useRadio, useReducedMotion, useWebGLSupport } from '../lib/hooks'
import { WebGLBoundary } from './Stages'

// three.js loads with the turntable, the first time the radio plays.
const TurntableCanvas = lazy(() => import('../three/turntable/TurntableCanvas'))

function PlayIcon({ playing }: { playing: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      {playing ? (
        <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" />
      ) : (
        <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />
      )}
    </svg>
  )
}

/**
 * Casa Radio's turntable, in the corner of the screen from the first play: the platter spins up, the arm swings
 * over the record and the needle drops as the music starts. It stays on every page, paused with the arm back on
 * its rest, until closed. It needs WebGL and stays away under reduced motion; the header's control works either way.
 */
export function RadioDock() {
  const radio = useRadio()
  const [deck] = useDesk()
  const booth = useBoothOnScreen()
  const webgl = useWebGLSupport()
  const reducedMotion = useReducedMotion()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  // Opens whenever the radio starts playing (state adjusted while rendering, rather than in an effect).
  const [seen, setSeen] = useState(radio.since)
  if (radio.since !== seen) {
    setSeen(radio.since)
    if (radio.on) setOpen(true)
  }
  if (!open || !webgl || reducedMotion) return null
  // On the landing page it steps aside (and stops drawing) while the booth, with its own decks, is on screen.
  const hidden = pathname === '/' && booth

  const { on, mix } = radio
  return (
    <aside className="radio-dock" aria-label="Casa Radio turntable" data-hidden={hidden || undefined} inert={hidden}>
      {/* Tapping the record plays or pauses, like the button below it. */}
      <div className="radio-dock-deck" aria-hidden onClick={casaSound.toggleRadio}>
        <WebGLBoundary name="turntable">
          <Suspense fallback={null}>
            <TurntableCanvas deck={deck} paused={hidden} />
          </Suspense>
        </WebGLBoundary>
      </div>
      <div className="radio-dock-bar">
        <button
          type="button"
          className="radio-dock-button"
          aria-label={on ? 'Pause Casa Radio' : 'Play Casa Radio'}
          onClick={casaSound.toggleRadio}
        >
          <PlayIcon playing={on} />
        </button>
        <p className="radio-dock-now mono">
          {mix.title} · {mix.artist}
        </p>
        <button
          type="button"
          className="radio-dock-button"
          aria-label="Stop the radio and close the turntable"
          onClick={() => {
            casaSound.pauseRadio()
            setOpen(false)
          }}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </aside>
  )
}
