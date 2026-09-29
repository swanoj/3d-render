import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { mixes } from '../content/radio'
import type { Mix } from '../content/types'
import { casaSound, crossGain, PITCH_RANGE, type DeckIndex, type DeckState } from '../lib/casaSound'
import { useDesk, useDeskControls, useRadio, useReducedMotion, useWebGLSupport } from '../lib/hooks'
import type { DeskAnchors, DeskScroll } from '../three/desk/DeskCanvas'
import { FLIGHT_MS, type Flight } from '../three/desk/layout'
import { Note } from './Scribble'
import { WebGLBoundary } from './Stages'

// three.js and the desk load as their own chunk, after the page.
const DeskCanvas = lazy(() => import('../three/desk/DeskCanvas'))

/** How long the arm takes to get home before a record comes off a playing deck, and a record's trip off it. */
const CLEAR_MS = 750
const OFF_MS = 450

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
 * Which deck a record from the crate goes on: one that has it already, else a free one (deck 1 first), else the one
 * the room's hearing less of, as a DJ lines up the next record on the other deck.
 */
function deckFor(mix: Mix, desk: readonly [DeckState, DeckState], decks: 1 | 2): DeckIndex {
  if (decks === 1) return 0
  if (desk[0].record?.id === mix.id) return 0
  if (desk[1].record?.id === mix.id) return 1
  if (!casaSound.isPlaying(0)) return 0
  if (!casaSound.isPlaying(1)) return 1
  const { faders, crossfader } = casaSound.controls()
  const heard = (i: DeckIndex) => faders[i] ** 2 * crossGain(crossfader, i)
  if (Math.abs(heard(0) - heard(1)) > 0.01) return heard(1) < heard(0) ? 1 : 0
  return desk[1].since < desk[0].since ? 1 : 0
}

/** The decks and the mixer as ordinary form controls, for the keyboard: shown when one of them has focus. */
function DeskKeys({ desk, decks }: { desk: readonly [DeckState, DeckState]; decks: 1 | 2 }) {
  const { pitch, crossfader } = useDeskControls()
  const shown = decks === 2 ? ([0, 1] as const) : ([0] as const)
  return (
    <div className="dj-desk-keys" role="group" aria-label="Decks and mixer">
      {shown.map((i) => {
        const playing = casaSound.isPlaying(i)
        return (
          <div key={i} className="dj-desk-key">
            <button type="button" aria-pressed={playing} onClick={() => (playing ? casaSound.pause(i) : casaSound.play(i))}>
              {playing ? 'Stop' : 'Play'} deck {i + 1}
              <span className="visually-hidden">{desk[i].record ? `, ${desk[i].record?.title}` : ''}</span>
            </button>
            <label>
              Deck {i + 1} tempo
              <input
                type="range"
                min={-8}
                max={8}
                step={0.1}
                value={(pitch[i] * PITCH_RANGE * 100).toFixed(1)}
                onChange={(event) => casaSound.setPitch(i, Number(event.target.value) / (PITCH_RANGE * 100))}
              />
            </label>
          </div>
        )
      })}
      {decks === 2 && (
        <label className="dj-desk-key">
          Crossfader
          <input
            type="range"
            min={-1}
            max={1}
            step={0.05}
            value={crossfader}
            onChange={(event) => casaSound.setCrossfader(Number(event.target.value))}
          />
        </label>
      )}
    </div>
  )
}

/**
 * The landing page's lower third: a DJ desk along the bottom of the screen, in 3D. Headphones on the left, two
 * decks with a mixer between them, and a crate of records to dig through. It's all playable: drop a record on, move
 * the needle, ride the pitch, mix with the crossfader, scratch.
 *
 * It sticks to the bottom of the screen as the page scrolls, steps aside while the Casa TV room fills the screen,
 * and comes to rest above the footer. The camera starts low and cranes over the desk as the page scrolls. Without
 * WebGL, or with reduced motion, the same controls sit on a plain bar.
 */
export function DjDesk() {
  const radio = useRadio()
  const desk = useDesk()
  const webgl = useWebGLSupport()
  const reducedMotion = useReducedMotion()
  const three = webgl && !reducedMotion
  const [selected, setSelected] = useState(0)
  const [flights, setFlights] = useState<Flight[]>([])
  const [decks, setDecks] = useState<1 | 2>(2)
  const [away, setAway] = useState(false)
  const [over, setOver] = useState(false)
  const [ready, setReady] = useState(false)
  const [hint, setHint] = useState(false)
  const scroll = useRef<DeskScroll>({ over: 0, page: 0 })
  const note = useRef<HTMLDivElement>(null)
  const crate = useRef<HTMLDivElement>(null)
  const timers = useRef<number[]>([])
  const flightIds = useRef(0)

  // Where the page is, for the camera, and whether the Casa TV room has the screen. How to play the desk shows
  // for a few seconds each time the camera arrives over it.
  useEffect(() => {
    let arrived = false
    let hinting = 0
    const update = () => {
      const view = window.innerHeight
      const travel = document.documentElement.scrollHeight - view
      const tv = document.querySelector('.casa-tv')?.getBoundingClientRect()
      // The camera cranes over the desk as the page scrolls, and is right over it just before the Casa TV room
      // takes the screen (when the room's top reaches the middle); a screen down if there's no room.
      const craned = tv ? (tv.top + window.scrollY - view * 0.5) * 0.92 : view
      scroll.current.over = Math.min(1, window.scrollY / Math.max(view * 0.3, craned))
      scroll.current.page = travel > 0 ? window.scrollY / travel : 0
      const tucked = Boolean(tv && tv.top < view * 0.5 && tv.bottom > view * 0.5)
      const isOver = scroll.current.over > 0.6
      setOver(isOver)
      setAway(tucked)
      if (isOver && !tucked && !arrived) {
        setHint(true)
        window.clearTimeout(hinting)
        hinting = window.setTimeout(() => setHint(false), 8000)
      } else if ((!isOver || tucked) && arrived) setHint(false)
      arrived = isOver && !tucked
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.clearTimeout(hinting)
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  // Leaving the page, the second deck and the mixer go quiet (Casa Radio plays on); pending landings are dropped.
  useEffect(
    () => () => {
      for (const timer of timers.current) window.clearTimeout(timer)
      casaSound.leaveDesk()
    },
    [],
  )

  // The labels follow the 3D: the note points at deck 1, the crate's controls sit under its record.
  const place = useCallback((anchors: DeskAnchors) => {
    if (note.current) note.current.style.transform = `translate3d(${anchors.deck[0]}px, ${anchors.deck[1]}px, 0)`
    const bar = crate.current?.parentElement?.clientWidth ?? 0
    const x = Math.min(Math.max(anchors.crate[0], 130), bar - 130)
    if (crate.current) crate.current.style.transform = `translate3d(${x}px, 0, 0)`
    setDecks(anchors.decks)
  }, [])

  const later = (run: () => void, ms: number) => {
    timers.current.push(window.setTimeout(run, Math.max(0, ms)))
  }
  const flip = (step: number) => setSelected((index) => (index + step + mixes.length) % mixes.length)

  /**
   * Plays a record from the crate (on `onto`, or whichever deck suits): the record that's on comes off back into
   * its sleeve, the new one comes out of its sleeve, flies over and lands on the platter, and the needle drops.
   */
  const playRecord = (index: number, onto?: DeckIndex) => {
    const mix = mixes[index]
    if (!mix || flights.some((flight) => flight.way === 'in')) return
    const target = onto ?? deckFor(mix, desk, decks)
    const deck = desk[target]
    casaSound.warmUp()
    if (deck.record?.id === mix.id) {
      if (!casaSound.isPlaying(target)) casaSound.play(target)
      return
    }
    if (!three || !ready) {
      casaSound.play(target, mix.id)
      return
    }
    const now = performance.now()
    let arrives = now + 40
    const old = deck.record
    if (old) {
      // A playing record waits for the arm to get home before it comes off.
      const clear = deck.arm.at === 'rest' ? 0 : CLEAR_MS
      if (clear) casaSound.pause(target)
      const leaving: Flight = { id: ++flightIds.current, mix: old, slot: mixes.indexOf(old), deck: target, way: 'out', start: now + clear }
      later(() => {
        casaSound.eject(target)
        setFlights((current) => [...current, leaving])
      }, clear)
      later(() => setFlights((current) => current.filter((flight) => flight.id !== leaving.id)), clear + FLIGHT_MS + 60)
      arrives = now + clear + OFF_MS
    }
    const coming: Flight = { id: ++flightIds.current, mix, slot: index, deck: target, way: 'in', start: arrives }
    setFlights((current) => [...current, coming])
    // As it lands, the deck takes it, the platter starts and the arm swings over.
    later(() => {
      casaSound.play(target, mix.id)
      setFlights((current) => current.filter((flight) => flight.id !== coming.id))
    }, arrives + FLIGHT_MS - now)
  }

  /** A tap on a deck: stop it, play it, or with no record on, put on the one showing in the crate. */
  const tapDeck = (i: DeckIndex) => {
    if (casaSound.isPlaying(i)) return casaSound.pause(i)
    if (desk[i].record) return casaSound.play(i)
    playRecord(selected, i)
  }

  const shown = mixes[selected] ?? mixes[0]
  const onDeck = desk.some((deck, i) => deck.record?.id === shown.id && casaSound.isPlaying(i as DeckIndex))
  const landing = flights.some((flight) => flight.way === 'in')
  return (
    <section
      className="dj-desk"
      aria-label="Casa Radio DJ desk"
      data-away={away || undefined}
      data-over={over || undefined}
      data-hint={hint || undefined}
      data-three={(three && ready) || undefined}
    >
      <div className="dj-desk-stage" aria-hidden>
        {three && (
          <WebGLBoundary name="DJ desk">
            <Suspense fallback={null}>
              <DeskCanvas
                desk={desk}
                selected={selected}
                flights={flights}
                active={!away}
                scroll={scroll}
                onTap={tapDeck}
                onToggle={casaSound.toggleRadio}
                onFlip={flip}
                onPlay={(index) => playRecord(index)}
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

      <p className="dj-desk-hint mono" aria-hidden>
        <span className="dj-desk-hint-long">Scroll the crate to dig · drag the needle on or off · slide the pitch · crossfade</span>
        <span className="dj-desk-hint-short">Swipe the crate · drag the needle · slide the pitch</span>
      </p>

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

      <DeskKeys desk={desk} decks={decks} />

      <div ref={crate} className="dj-desk-crate-anchor">
        <div className="dj-desk-crate" role="group" aria-label="Record crate">
          <button type="button" className="dj-desk-flip" onClick={() => flip(-1)} aria-label="Previous record">
            ‹
          </button>
          <span className="dj-desk-record mono">{shown.title}</span>
          <button type="button" className="dj-desk-flip" onClick={() => flip(1)} aria-label="Next record">
            ›
          </button>
          <button type="button" className="dj-desk-spin" onClick={() => playRecord(selected)} disabled={onDeck || landing}>
            {onDeck ? 'Playing' : 'Play'}
            <span className="visually-hidden"> {shown.title}</span>
          </button>
        </div>
      </div>
    </section>
  )
}
