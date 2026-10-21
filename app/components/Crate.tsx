import { lazy, Suspense, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router'
import type { NightView } from '../content/types'
import { casaSound } from '../lib/casaSound'
import { clockTime, dateParts, posterDate } from '../lib/format'
import { gsap, ScrollTrigger, useGSAP } from '../lib/gsap'
import { useDesk, useRadio, useReducedMotion, useWebGLSupport } from '../lib/hooks'
import { nightRecord } from '../lib/nightRecord'
import { eventPath } from '../lib/paths'
import { useCopy } from '../lib/useSite'
import { Countdown } from './Countdown'
import { EventArt, EventCard, EventFeature } from './EventCard'
import { Lineup } from './Lineup'
import { StampedTitle } from './ScrollFx'
import { Note, Scribble } from './Scribble'
import { WebGLBoundary } from './Stages'
import { TicketButton } from './TicketButton'

// three.js comes with the turntable, once the crate's close.
const TurntableCanvas = lazy(() => import('../three/turntable/TurntableCanvas'))

/*
 * The crate, on the v2 home page: the coming Saturdays as records in a crate by the door, each night's poster on its
 * sleeve. Scrolling flicks through them (the crate holds still while you do), as do dragging, the arrow keys and the
 * dates underneath. The one in front goes on Casa Radio's turntable beside it: drop the needle (or press play) and
 * that night's groove plays while you decide, with its tickets right there.
 */

/** How far to scroll, in screen heights, to flick from one record to the next. */
const STEP = 0.36

/** Where sleeve `i` sits with the crate flicked to `p`: in front at `p`, the rest further back, flicked ones fallen forward. */
function sleeveStyle(i: number, p: number): CSSProperties {
  const d = i - p
  if (d >= 0) {
    const back = Math.min(d, 6)
    return {
      transform: `translate3d(0, ${(-back * 5).toFixed(2)}%, ${(-back * 80).toFixed(1)}px) rotateX(${(7 + back * 1.5).toFixed(2)}deg)`,
      filter: `brightness(${(1 - Math.min(d, 4) * 0.14).toFixed(3)})`,
      // Four deep, then they fade into the back of the crate.
      opacity: Math.min(1, Math.max(0, 4.5 - d)),
      zIndex: 100 - i,
    }
  }
  const f = Math.min(1, -d)
  return {
    transform: `translate3d(0, ${(f * 10).toFixed(2)}%, ${(f * 60).toFixed(1)}px) rotateX(${(7 - f * 92).toFixed(2)}deg)`,
    filter: 'none',
    opacity: Math.max(0, 1 - Math.max(0, -d - 0.5) * 2.5),
    zIndex: 200 + i,
  }
}

function place(element: HTMLElement, style: CSSProperties) {
  element.style.transform = String(style.transform)
  element.style.filter = String(style.filter)
  element.style.opacity = String(style.opacity)
  element.style.zIndex = String(style.zIndex)
}

interface CrateProps {
  nights: NightView[]
  now: number
  offset: number
}

/** The events block with the crate in it; with reduced motion, the plain list of posters instead. */
export function Crate({ nights, now, offset }: CrateProps) {
  const reducedMotion = useReducedMotion()
  if (nights.length && !reducedMotion) return <CrateDig nights={nights} now={now} offset={offset} />
  const [next, ...later] = nights
  return (
    <section id="events" className="surface surface--charcoal block events-block" data-walk="door" aria-labelledby="events-title">
      <div className="block-heading">
        <StampedTitle id="events-title" className="hand block-title" extra={<Scribble kind="underline" className="block-title-underline" />}>
          Upcoming events
        </StampedTitle>
        <Link to="/events" className="text-link" viewTransition>
          All events →
        </Link>
      </div>
      {next ? (
        <>
          <EventFeature night={next} now={now} offset={offset} />
          {later.length > 0 && (
            <div className="event-grid">
              {later.slice(0, 3).map((night) => (
                <EventCard key={night.slug} night={night} />
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="mono">New events soon. Get on the list to hear first.</p>
      )}
    </section>
  )
}

function CrateDig({ nights, now, offset }: CrateProps) {
  const { venue } = useCopy()
  const radio = useRadio()
  const [deck] = useDesk()
  const webgl = useWebGLSupport()
  const records = useMemo(() => nights.map(nightRecord), [nights])
  const n = nights.length
  const [current, setCurrent] = useState(0)
  // While the crate's pinned on screen, flicking through it.
  const [digging, setDigging] = useState(false)
  const pin = useRef<HTMLDivElement>(null)
  const sleeves = useRef<(HTMLDivElement | null)[]>([])
  const trigger = useRef<ScrollTrigger | null>(null)
  const turntable = useRef<HTMLDivElement>(null)
  const [deckNear, setDeckNear] = useState(false)
  const drag = useRef<{ y: number; moved: number } | null>(null)

  // Scrolling through the crate flicks through it, the crate pinned in place until the last record.
  useGSAP(
    () => {
      if (n < 2 || !pin.current) return
      const state = { p: 0 }
      let shown = 0
      const tween = gsap.to(state, {
        p: n - 1,
        ease: 'none',
        onUpdate: () => {
          sleeves.current.forEach((element, i) => {
            if (element) place(element, sleeveStyle(i, state.p))
          })
          const index = Math.round(state.p)
          if (index !== shown) {
            shown = index
            setCurrent(index)
            casaSound.flick()
          }
        },
        scrollTrigger: {
          trigger: pin.current,
          start: 'top top',
          end: () => `+=${(n - 1) * window.innerHeight * STEP}`,
          pin: true,
          scrub: 0.5,
          snap: { snapTo: 1 / (n - 1), duration: { min: 0.15, max: 0.45 }, delay: 0.06, ease: 'power2.out' },
          invalidateOnRefresh: true,
          onToggle: (self) => setDigging(self.isActive),
        },
      })
      trigger.current = tween.scrollTrigger ?? null
      return () => {
        trigger.current = null
      }
    },
    { dependencies: [n], scope: pin },
  )

  // While you're at the crate, the record in front goes on the turntable, so its label shows the night. With the
  // music on, the needle goes down on it once you've stopped on it a moment, the way a DJ would try it.
  useEffect(() => {
    const record = records[current]
    if (!record || (n > 1 && !digging)) return
    const id = window.setTimeout(() => casaSound.put(0, record), radio.on ? 650 : 180)
    return () => window.clearTimeout(id)
  }, [current, records, radio.on, digging, n])

  // The turntable loads as the crate comes near, and the radio's own turntable in the corner steps aside while
  // this one's on screen.
  useEffect(() => {
    const element = turntable.current
    if (!element) return
    const near = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setDeckNear(true)
    }, { rootMargin: '60% 0px' })
    const onScreen = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) document.documentElement.dataset.crateDeck = ''
        else delete document.documentElement.dataset.crateDeck
      },
      { threshold: 0.3 },
    )
    near.observe(element)
    onScreen.observe(element)
    return () => {
      near.disconnect()
      onScreen.disconnect()
      delete document.documentElement.dataset.crateDeck
      // The turntable's pitch and speed go back to normal for the rest of the site.
      casaSound.leaveDesk()
    }
  }, [])

  /** Flicks to night `i`: scrolls the page to where the crate shows it. */
  const go = (i: number) => {
    const index = Math.max(0, Math.min(n - 1, i))
    const st = trigger.current
    if (!st) return setCurrent(index)
    window.scrollTo({ top: st.start + (index / (n - 1)) * (st.end - st.start), behavior: 'smooth' })
  }

  const playing = (i: number) => radio.on && radio.mix.id === records[i]?.id
  /** Plays night `i`'s record, or stops it if it's playing. From a click: browsers only start sound after one. */
  const play = (i: number) => {
    if (playing(i)) return casaSound.pauseRadio()
    casaSound.put(0, records[i])
    casaSound.playRadio()
  }

  const night = nights[current]
  const doors = Date.parse(night.startsAt)

  return (
    <section id="events" className="surface surface--charcoal crate-block" data-walk="door" aria-labelledby="events-title">
      <div ref={pin} className="crate-pin">
        <div className="block-heading crate-heading">
          <StampedTitle id="events-title" className="hand block-title crate-title" extra={<Scribble kind="underline" className="block-title-underline" />}>
            Upcoming events
          </StampedTitle>
          <Link to="/events" className="text-link" viewTransition>
            All events →
          </Link>
        </div>

        <div className="crate-layout">
          <div className="crate-side">
            <div
              className="crate"
              tabIndex={0}
              role="group"
              aria-roledescription="record crate"
              aria-label={`The next ${n} Saturdays. Arrow keys flick through them, Enter plays the one in front.`}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown' || event.key === 'ArrowRight') go(current + 1)
                else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') go(current - 1)
                else if (event.key === 'Enter' || event.key === ' ') play(current)
                else return
                event.preventDefault()
              }}
              // A mouse drags the records forward and back; a finger already scrolls the page, which does the same.
              onPointerDown={(event) => {
                if (event.pointerType !== 'mouse' || event.button !== 0) return
                drag.current = { y: event.clientY, moved: 0 }
                event.currentTarget.setPointerCapture(event.pointerId)
              }}
              onPointerMove={(event) => {
                const held = drag.current
                if (!held) return
                const dy = event.clientY - held.y
                held.y = event.clientY
                held.moved += Math.abs(dy)
                window.scrollBy(0, dy * 2.4)
              }}
              onPointerUp={() => {
                window.setTimeout(() => (drag.current = null))
              }}
              onPointerCancel={() => (drag.current = null)}
            >
              <div className="crate-records">
                {nights.map((item, i) => {
                  const date = dateParts(item.startsAt)
                  return (
                    <div
                      key={item.slug}
                      ref={(element) => {
                        sleeves.current[i] = element
                      }}
                      className="crate-sleeve"
                      style={{ ...sleeveStyle(i, 0), '--i': i } as CSSProperties}
                      aria-hidden
                      onClick={() => {
                        if ((drag.current?.moved ?? 0) > 6) return
                        if (i === current) play(i)
                        else go(i)
                      }}
                    >
                      <span className="crate-cover">
                        <EventArt artwork={item.artwork} sizes="(max-width: 900px) 62vw, 32vw" eager={i < 2} />
                      </span>
                      <span className="crate-sheen" />
                      <span className="crate-sticker">
                        <span className="crate-sticker-day">{date.weekday}</span>
                        <span className="crate-sticker-date">
                          {date.day} {date.month}
                        </span>
                      </span>
                      {item.format === 'vinyl' && <span className="crate-badge">All vinyl</span>}
                      {item.status === 'sold-out' && <span className="crate-stamp">Sold out</span>}
                    </div>
                  )
                })}
              </div>
              <div className="crate-front" aria-hidden>
                <span className="crate-stencil">Club Casa</span>
                <span className="crate-stencil crate-stencil--small">Every Saturday</span>
              </div>
              <Note className="crate-note" arrow="arrow" flip delay={600}>
                flick through
              </Note>
            </div>

            <ol className="crate-dates" aria-label="The Saturdays in the crate">
              {nights.map((item, i) => {
                const date = dateParts(item.startsAt)
                return (
                  <li key={item.slug}>
                    <button
                      type="button"
                      className="crate-date-button"
                      aria-current={i === current ? 'true' : undefined}
                      aria-label={posterDate(item.startsAt)}
                      onClick={() => go(i)}
                    >
                      <span className="crate-date-day">{date.day}</span>
                      <span className="crate-date-month">{date.month}</span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </div>

          <div className="crate-deck-side">
            <div ref={turntable} className="crate-turntable">
              {webgl && deckNear && (
                <WebGLBoundary name="crate turntable">
                  <Suspense fallback={null}>
                    <TurntableCanvas deck={deck} playable />
                  </Suspense>
                </WebGLBoundary>
              )}
              {!playing(current) && (
                <Note className="crate-needle-note" arrow="arrow" delay={300}>
                  drop the needle
                </Note>
              )}
            </div>

            <article className="crate-details" aria-live="polite">
              <p className="label crate-kicker">
                <span className="event-feature-dot" aria-hidden />
                {current === 0 ? 'Next up' : 'Coming up'} · {night.title}
              </p>
              <h3 className="hand crate-date">
                <Link to={eventPath(night)} viewTransition>
                  <time dateTime={night.startsAt}>{posterDate(night.startsAt)}</time>
                </Link>
              </h3>
              <p className="label crate-meta">
                {clockTime(night.startsAt)} – {night.closes} · {venue.host}, {venue.suburb}
              </p>
              {night.acts.length ? <Lineup acts={night.acts} /> : <p className="mono crate-lineup">Line-up to be announced</p>}
              <div className="button-row crate-actions">
                <button type="button" className="button crate-play" aria-pressed={playing(current)} onClick={() => play(current)}>
                  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden>
                    {playing(current) ? (
                      <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" />
                    ) : (
                      <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />
                    )}
                  </svg>
                  {playing(current) ? 'Playing' : 'Hear the night'}
                </button>
                <TicketButton night={night} />
                <Link to={eventPath(night)} className="text-link crate-view" viewTransition>
                  View event →
                </Link>
              </div>
              {current === 0 && doors > now && (
                <p className="mono crate-countdown">
                  Doors in <Countdown to={doors} now={now} offset={offset} />
                </p>
              )}
            </article>
          </div>
        </div>
      </div>
    </section>
  )
}
