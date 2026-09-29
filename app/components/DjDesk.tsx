import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { mixes } from '../content/radio'
import { casaSound } from '../lib/casaSound'
import { useRadio, useReducedMotion, useWebGLSupport } from '../lib/hooks'
import type { DeskAnchors, DeskScroll } from '../three/desk/DeskCanvas'
import { FLIGHT_MS } from '../three/desk/layout'
import { Note } from './Scribble'
import { WebGLBoundary } from './Stages'

// three.js and the desk load as their own chunk, after the page.
const DeskCanvas = lazy(() => import('../three/desk/DeskCanvas'))

interface Flight {
  index: number
  start: number
}

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
 * The landing page's lower third: a DJ desk along the bottom of the screen, in 3D. Headphones on the left, the
 * deck that plays Casa Radio, a mixer, a second deck and a crate of records. Tap the deck or the headphones to play;
 * flick through the crate and play a record, and it flies out of its sleeve onto the deck before the needle drops.
 *
 * It sticks to the bottom of the screen as the page scrolls, steps aside while the Casa TV room fills the screen,
 * and comes to rest above the footer. The camera follows the scroll. Without WebGL, or with reduced motion, the
 * same controls sit on a plain bar.
 */
export function DjDesk() {
  const radio = useRadio()
  const webgl = useWebGLSupport()
  const reducedMotion = useReducedMotion()
  const three = webgl && !reducedMotion
  const [selected, setSelected] = useState(0)
  const [flight, setFlight] = useState<Flight | null>(null)
  const [away, setAway] = useState(false)
  const [ready, setReady] = useState(false)
  const scroll = useRef<DeskScroll>({ hero: 0, page: 0 })
  const note = useRef<HTMLDivElement>(null)
  const crate = useRef<HTMLDivElement>(null)
  const landing = useRef(0)

  // Where the page is, for the camera, and whether the Casa TV room has the screen.
  useEffect(() => {
    const update = () => {
      const view = window.innerHeight
      const travel = document.documentElement.scrollHeight - view
      scroll.current.hero = Math.min(1, window.scrollY / view)
      scroll.current.page = travel > 0 ? window.scrollY / travel : 0
      const tv = document.querySelector('.casa-tv')?.getBoundingClientRect()
      setAway(Boolean(tv && tv.top < view * 0.5 && tv.bottom > view * 0.5))
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])
  useEffect(() => () => window.clearTimeout(landing.current), [])

  // The labels follow the 3D: the note points at the deck, the crate's controls sit under its front record.
  const place = useCallback(({ deck, crate: front }: DeskAnchors) => {
    if (note.current) note.current.style.transform = `translate3d(${deck[0]}px, ${deck[1]}px, 0)`
    const bar = crate.current?.parentElement?.clientWidth ?? 0
    const x = Math.min(Math.max(front[0], 130), bar - 130)
    if (crate.current) crate.current.style.transform = `translate3d(${x}px, 0, 0)`
  }, [])

  const flip = (step: number) => setSelected((index) => (index + step + mixes.length) % mixes.length)

  /** Plays a record from the crate: out of its sleeve and onto the deck, then the needle drops. */
  const playRecord = (index: number) => {
    const mix = mixes[index]
    if (!mix || flight || (radio.on && radio.mix.id === mix.id)) return
    casaSound.warmUp()
    if (!three || !ready) {
      casaSound.playRadio(mix.id)
      return
    }
    // A record already playing comes off first: the arm lifts and goes home before the new one lands.
    const wasOn = radio.on
    if (wasOn) casaSound.pauseRadio()
    const start = performance.now() + (wasOn ? 500 : 40)
    setFlight({ index, start })
    window.clearTimeout(landing.current)
    landing.current = window.setTimeout(
      () => {
        casaSound.playRadio(mix.id)
        setFlight(null)
      },
      start + FLIGHT_MS - performance.now(),
    )
  }

  const shown = mixes[selected] ?? mixes[0]
  const onDeck = radio.on && radio.mix.id === shown.id
  return (
    <section
      className="dj-desk"
      aria-label="Casa Radio DJ desk"
      data-away={away || undefined}
      data-three={(three && ready) || undefined}
    >
      <div className="dj-desk-stage" aria-hidden>
        {three && (
          <WebGLBoundary name="DJ desk">
            <Suspense fallback={null}>
              <DeskCanvas
                radio={radio}
                selected={selected}
                flight={flight}
                active={!away}
                scroll={scroll}
                onToggle={casaSound.toggleRadio}
                onFlip={() => flip(1)}
                onPlay={playRecord}
                onAnchors={place}
                onReady={() => setReady(true)}
              />
            </Suspense>
          </WebGLBoundary>
        )}
      </div>

      {!radio.on && (
        <div ref={note} className="dj-desk-pointer">
          <Note className="dj-desk-note" arrow="arrow" delay={900}>
            play music
          </Note>
        </div>
      )}

      <div className="dj-desk-controls">
        <button type="button" className="dj-desk-play" aria-pressed={radio.on} onClick={casaSound.toggleRadio}>
          <PlayIcon playing={radio.on} />
          {radio.on ? 'Pause' : 'Play music'}
        </button>
        <p className="dj-desk-now mono" aria-live="polite">
          {radio.on ? (
            <>
              <span className="on-air">On air</span> {radio.mix.title} · {radio.mix.artist}
            </>
          ) : (
            'Casa Radio · Pick a record'
          )}
        </p>
      </div>

      <div ref={crate} className="dj-desk-crate-anchor">
        <div className="dj-desk-crate" role="group" aria-label="Record crate">
          <button type="button" className="dj-desk-flip" onClick={() => flip(-1)} aria-label="Previous record">
            ‹
          </button>
          <span className="dj-desk-record mono">{shown.title}</span>
          <button type="button" className="dj-desk-flip" onClick={() => flip(1)} aria-label="Next record">
            ›
          </button>
          <button
            type="button"
            className="dj-desk-spin"
            onClick={() => playRecord(selected)}
            disabled={onDeck || Boolean(flight)}
          >
            {onDeck ? 'Playing' : 'Play'}
            <span className="visually-hidden"> {shown.title}</span>
          </button>
        </div>
      </div>
    </section>
  )
}
