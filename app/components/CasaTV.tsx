import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from 'react'
import { casaSound } from '../lib/casaSound'
import { pad2 } from '../lib/format'
import { useReducedMotion, useWebGLSupport } from '../lib/hooks'
import { useInView } from '../lib/useInView'
import { CHANNELS, channelDescription, drawChannel, loadTvAssets, SCREEN, type TvData } from '../three/channels'
import type { Lamps } from '../three/room/RoomCanvas'
import { Note } from './Scribble'
import { WebGLBoundary } from './Stages'

// The room and three.js load as their own chunk, and only once the section is close to the viewport.
const RoomCanvas = lazy(() => import('../three/room/RoomCanvas'))

/**
 * Casa TV, from the concept deck's "large, still-functional old TV on stage": an old set in a warm corner that
 * shows the next night, the line-up, the house rules, vinyl nights, a test card and a live security camera. The
 * section holds still while you scroll, the site header steps aside, and the camera walks in from the doorway to
 * the set. Tap the set, use the channel buttons or the arrow and number keys to change channel; the lamps switch
 * and the sound (the club through the wall) is one tap or M away. A flat set draws the same channels during
 * loading and without WebGL.
 */
export function CasaTV({ data }: { data: TvData }) {
  const [tuner, setTuner] = useState({ channel: 0, flicks: 0 })
  const [lamps, setLamps] = useState<Lamps>({ floor: true, table: true })
  const [roomReady, setRoomReady] = useState(false)
  const [sectionRef, near] = useInView<HTMLElement>({ once: true, rootMargin: '600px 0px' })
  const [stageRef, visible] = useInView<HTMLDivElement>({ rootMargin: '80px 0px' })
  const webgl = useWebGLSupport()
  const reducedMotion = useReducedMotion()
  const sound = useSyncExternalStore(casaSound.subscribe, casaSound.isOn, () => false)
  const { progress, engaged } = useRoomScroll(sectionRef, webgl && !reducedMotion)
  const tapNote = useRef<HTMLDivElement>(null)
  const { channel, flicks } = tuner
  const current = CHANNELS[channel]

  // The room reports where the picture's edge is each frame; the note follows it without re-rendering.
  const placeNote = useCallback((x: number, y: number, opacity: number) => {
    const note = tapNote.current
    if (!note) return
    note.style.transform = `translate3d(${x}px, ${y}px, 0)`
    note.style.opacity = String(opacity)
  }, [])

  /** Changes channel to `to(current)`, wrapping round the dial. */
  const tune = useCallback(
    (to: (current: number) => number) =>
      setTuner((state) => {
        const next = (to(state.channel) + CHANNELS.length) % CHANNELS.length
        return next === state.channel ? state : { channel: next, flicks: state.flicks + 1 }
      }),
    [],
  )

  const toggleLamp = useCallback((lamp: keyof Lamps) => {
    setLamps((state) => ({ ...state, [lamp]: !state[lamp] }))
    casaSound.lamp()
  }, [])

  // The set's own sounds follow the channel: the clunk and static of a change, then that channel's noise.
  useEffect(() => {
    casaSound.tune(CHANNELS[channel].id, flicks > 0)
  }, [channel, flicks])

  // While the room fills the screen: ← and → or 1–6 change channel, M turns the sound on or off, L the lamps.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!engaged.current || event.repeat || event.defaultPrevented) return
      if (event.altKey || event.ctrlKey || event.metaKey) return
      if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable]')) return
      const key = event.key.toLowerCase()
      if (key === 'arrowright') tune((at) => at + 1)
      else if (key === 'arrowleft') tune((at) => at - 1)
      else if (/^[1-9]$/.test(key) && Number(key) <= CHANNELS.length) tune(() => Number(key) - 1)
      else if (key === 'm') casaSound.toggle()
      else if (key === 'l') {
        setLamps((state) => {
          const on = !(state.floor || state.table)
          return { floor: on, table: on }
        })
        casaSound.lamp()
      } else return
      event.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [engaged, tune])

  return (
    <section
      ref={sectionRef}
      className="casa-tv"
      aria-labelledby="casa-tv-title"
      data-room={roomReady ? 'ready' : undefined}
      data-3d={webgl || undefined}
    >
      <div className="casa-tv-pin">
        <div ref={stageRef} className="casa-tv-stage">
          <TvFallback
            channel={channel}
            flicks={flicks}
            data={data}
            paused={roomReady || !visible}
            reducedMotion={reducedMotion}
            onNext={() => tune((at) => at + 1)}
          />
          {webgl && near && (
            <WebGLBoundary name="TV">
              <Suspense fallback={null}>
                <RoomCanvas
                  channel={channel}
                  data={data}
                  active={visible}
                  reducedMotion={reducedMotion}
                  progress={progress}
                  onNext={() => tune((at) => at + 1)}
                  sound={sound}
                  onSound={casaSound.toggle}
                  lamps={lamps}
                  onLamp={toggleLamp}
                  onReady={() => setRoomReady(true)}
                  onNoteMove={placeNote}
                />
              </Suspense>
            </WebGLBoundary>
          )}
        </div>

        <div ref={tapNote} className="room-note" aria-hidden>
          <Note arrow="arrow" delay={300}>
            tap the telly
          </Note>
        </div>

        <header className="casa-tv-head">
          <p className="label">
            Channel {pad2(channel + 1)} of {pad2(CHANNELS.length)}
          </p>
          <h2 id="casa-tv-title" className="hand casa-tv-title">
            Casa TV
          </h2>
          <p className="casa-tv-keys mono">
            ← → channels · M sound{webgl ? ' · L lamps' : ''}
          </p>
          <Note className="casa-tv-note casa-tv-note--tall" arrow="drop" delay={600}>
            tap the telly
          </Note>
        </header>

        <button
          type="button"
          className="casa-tv-sound"
          aria-pressed={sound}
          aria-keyshortcuts="M"
          onClick={casaSound.toggle}
        >
          <SoundIcon on={sound} />
          Sound
        </button>

        <div className="casa-tv-controls">
          <button
            type="button"
            className="tv-button"
            onClick={() => tune((at) => at - 1)}
            aria-label="Previous channel"
            aria-keyshortcuts="ArrowLeft"
          >
            CH −
          </button>
          <p className="casa-tv-caption" aria-live="polite">
            <span className="label">
              CH {pad2(channel + 1)} · {current.name}
            </span>
            <span className="mono">{channelDescription(current.id, data)}</span>
          </p>
          <button
            type="button"
            className="tv-button"
            onClick={() => tune((at) => at + 1)}
            aria-label="Next channel"
            aria-keyshortcuts="ArrowRight"
          >
            CH +
          </button>
        </div>
      </div>
    </section>
  )
}

/**
 * Follows the section as the page scrolls, without re-rendering React:
 * - `progress`: how far through the pinned section the visitor is, 0 as it reaches the top of the screen and 1 as
 *   it lets go. The camera reads it every frame.
 * - `engaged`: the room fills most of the screen, so its keyboard controls are live.
 * It also tells the sound whether the room is on screen, and, when `immersive`, hides the site header while the
 * room is pinned (`html[data-immersed]`). Scrolling back up brings the header back, as anywhere else on the site.
 */
function useRoomScroll(section: RefObject<HTMLElement | null>, immersive: boolean) {
  const progress = useRef(0)
  const engaged = useRef(false)
  useEffect(() => {
    const element = section.current
    if (!element) return
    const root = document.documentElement
    let lastY = window.scrollY
    let goingUp = false
    const update = () => {
      const { top, bottom, height } = element.getBoundingClientRect()
      const view = window.innerHeight
      const travel = height - view
      progress.current = travel > 0 ? Math.min(1, Math.max(0, -top / travel)) : 1
      engaged.current = top <= view * 0.3 && bottom >= view * 0.7
      casaSound.setPresence(top < view && bottom > 0, progress.current)

      const y = window.scrollY
      if (Math.abs(y - lastY) > 6) {
        goingUp = y < lastY
        lastY = y
      }
      const pinned = top <= 0 && bottom >= view
      root.toggleAttribute('data-immersed', immersive && pinned && progress.current > 0.04 && !goingUp)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      root.removeAttribute('data-immersed')
      casaSound.setPresence(false, 0)
    }
  }, [section, immersive])
  return { progress, engaged }
}

/** A speaker, with sound waves while the sound is on and a cross while it's off. */
function SoundIcon({ on }: { on: boolean }) {
  return (
    <svg className="sound-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <path d="M3.5 9.5h3.8L12 5.6v12.8l-4.7-3.9H3.5z" fill="currentColor" />
      {on ? (
        <path d="M15.5 9a4.2 4.2 0 0 1 0 6M18.2 6.4a8 8 0 0 1 0 11.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      ) : (
        <path d="M16 9.5l5 5M21 9.5l-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      )}
    </svg>
  )
}

interface TvFallbackProps {
  channel: number
  /** Counts channel changes, so the static burst and channel number only show after a real change. */
  flicks: number
  data: TvData
  /** Stop drawing: the 3D room has taken over, or the set is off screen. */
  paused: boolean
  reducedMotion: boolean
  onNext: () => void
}

/** A flat TV set drawing the channels into a 2D canvas, with the CRT look done in CSS. */
function TvFallback({ channel, flicks, data, paused, reducedMotion, onNext }: TvFallbackProps) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const changedAt = useRef(-Infinity)

  useEffect(() => {
    if (flicks) changedAt.current = performance.now()
  }, [flicks])

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d')
    if (!ctx || paused) return
    let cancelled = false
    let frame = 0
    let timer = 0
    const start = performance.now()
    loadTvAssets().then(
      (assets) => {
        if (cancelled) return
        let failed = false
        const draw = (time: number) => {
          const osd = Math.min(1, Math.max(0, (changedAt.current + 2600 - time) / 400))
          try {
            drawChannel(ctx, channel, data, reducedMotion ? 0 : (time - start) / 1000, Date.now(), assets, osd)
          } catch (error) {
            if (!failed) console.warn('Casa TV could not draw a channel.', error)
            failed = true
          }
        }
        if (reducedMotion) {
          draw(performance.now())
          timer = window.setInterval(() => draw(performance.now()), 1000)
          return
        }
        let last = 0
        const loop = (time: number) => {
          if (time - last > 33) {
            draw(time)
            last = time
          }
          frame = requestAnimationFrame(loop)
        }
        frame = requestAnimationFrame(loop)
      },
      (error) => console.warn('Casa TV assets unavailable.', error),
    )
    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
      window.clearInterval(timer)
    }
  }, [channel, data, paused, reducedMotion])

  return (
    <div className="tv-fallback" aria-hidden>
      <div className="tv-set" onClick={onNext}>
        <div className="tv-screen">
          <canvas ref={canvas} width={SCREEN.width} height={SCREEN.height} />
          {flicks > 0 && <span key={flicks} className="tv-static" />}
        </div>
        <div className="tv-side">
          <span className="tv-knob tv-knob--channel" style={{ rotate: `${channel * (360 / CHANNELS.length)}deg` }} />
          <span className="tv-knob" />
          <span className="tv-grille" />
          <span className="tv-badge">CASA</span>
        </div>
      </div>
    </div>
  )
}
