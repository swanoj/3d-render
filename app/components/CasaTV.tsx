import { lazy, Suspense, useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { pad2 } from '../lib/format'
import { useReducedMotion, useWebGLSupport } from '../lib/hooks'
import { useInView } from '../lib/useInView'
import { CHANNELS, channelDescription, drawChannel, loadTvAssets, SCREEN, type TvData } from '../three/channels'
import { Note } from './Scribble'
import { WebGLBoundary } from './Stages'

// The room and three.js load as their own chunk, and only once the section is close to the viewport.
const RoomCanvas = lazy(() => import('../three/room/RoomCanvas'))

/**
 * Casa TV, from the concept deck's "large, still-functional old TV on stage": an old set in a warm corner that
 * shows the next night, the line-up, the house rules, vinyl nights and a test card. The section holds still while
 * you scroll and the camera walks in from the doorway to the set. Tap the set or use the channel buttons to change
 * channel. A flat set draws the same channels during loading and without WebGL.
 */
export function CasaTV({ data }: { data: TvData }) {
  const [tuner, setTuner] = useState({ channel: 0, flicks: 0 })
  const [roomReady, setRoomReady] = useState(false)
  const [sectionRef, near] = useInView<HTMLElement>({ once: true, rootMargin: '600px 0px' })
  const [stageRef, visible] = useInView<HTMLDivElement>({ rootMargin: '80px 0px' })
  const webgl = useWebGLSupport()
  const reducedMotion = useReducedMotion()
  const progress = useScrollProgress(sectionRef)
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

  const step = (by: number) =>
    setTuner((state) => ({
      channel: (state.channel + by + CHANNELS.length) % CHANNELS.length,
      flicks: state.flicks + 1,
    }))

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
            onNext={() => step(1)}
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
                  onNext={() => step(1)}
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
          <Note className="casa-tv-note casa-tv-note--tall" arrow="drop" delay={600}>
            tap the telly
          </Note>
        </header>

        <div className="casa-tv-controls">
          <button type="button" className="tv-button" onClick={() => step(-1)} aria-label="Previous channel">
            CH −
          </button>
          <p className="casa-tv-caption" aria-live="polite">
            <span className="label">
              CH {pad2(channel + 1)} · {current.name}
            </span>
            <span className="mono">{channelDescription(current.id, data)}</span>
          </p>
          <button type="button" className="tv-button" onClick={() => step(1)} aria-label="Next channel">
            CH +
          </button>
        </div>
      </div>
    </section>
  )
}

/**
 * How far the visitor has scrolled through the pinned section: 0 as it reaches the top of the screen, 1 as it lets
 * go. Kept in a ref and read every frame by the camera, so scrolling never re-renders React.
 */
function useScrollProgress(section: RefObject<HTMLElement | null>) {
  const progress = useRef(0)
  useEffect(() => {
    const element = section.current
    if (!element) return
    const update = () => {
      const { top, height } = element.getBoundingClientRect()
      const travel = height - window.innerHeight
      progress.current = travel > 0 ? Math.min(1, Math.max(0, -top / travel)) : 1
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [section])
  return progress
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
        const draw = (time: number) => {
          const osd = Math.min(1, Math.max(0, (changedAt.current + 2600 - time) / 400))
          drawChannel(ctx, channel, data, reducedMotion ? 0 : (time - start) / 1000, Date.now(), assets, osd)
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
