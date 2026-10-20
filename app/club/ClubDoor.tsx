import { useEffect, useRef, type CSSProperties, type RefObject } from 'react'
import { Mark } from '../components/Mark'
import { club, useClubPhase } from './club'

/** The mates glimpsed through the doorway: the moon, Casa and the dog (cells of the sprite sheet). */
const DANCERS = [
  { cell: 3, left: 4, size: 30, delay: 0 },
  { cell: 0, left: 24, size: 38, delay: 0.25 },
  { cell: 10, left: 46, size: 30, delay: 0.12 },
]

/** A cell of the 4 x 4 sprite sheet, as a mask position. */
const cellPosition = (cell: number) => `${(cell % 4) * (100 / 3)}% ${Math.floor(cell / 4) * (100 / 3)}%`

const NOTES = { door: 'psst… hold here', holding: 'keep holding…', open: 'you’re in!' } as const

/**
 * The door in the bottom-left of the hero. Only the light under it shows until the pointer comes down to that
 * corner (or a finger taps there); then it draws itself in, with Casa on the door behind a velvet rope. Holding
 * the pointer on it (pressing and holding, on a touch screen, or holding Space or Enter) swings it open.
 */
export function ClubDoor({ hero }: { hero: RefObject<HTMLElement | null> }) {
  const phase = useClubPhase()
  const root = useRef<HTMLDivElement>(null)
  const closed = phase === 'closed'

  // The bottom-left third of the hero brings the door out; wandering off for a moment puts it away again.
  useEffect(() => {
    const section = hero.current
    if (!section) return
    let dwell = 0
    let away = 0
    const inCorner = (event: PointerEvent) => {
      const box = section.getBoundingClientRect()
      return event.clientX - box.left < box.width / 3 && event.clientY - box.top > (box.height * 2) / 3
    }
    const wander = () => {
      window.clearTimeout(dwell)
      dwell = 0
      if (!away) {
        away = window.setTimeout(() => {
          away = 0
          club.conceal()
        }, 1600)
      }
    }
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      if (!inCorner(event)) return wander()
      window.clearTimeout(away)
      away = 0
      if (!dwell) dwell = window.setTimeout(() => club.reveal(), 140)
    }
    const tap = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' && inCorner(event)) club.reveal()
    }
    section.addEventListener('pointermove', move)
    section.addEventListener('pointerleave', wander)
    section.addEventListener('pointerdown', tap)
    return () => {
      section.removeEventListener('pointermove', move)
      section.removeEventListener('pointerleave', wander)
      section.removeEventListener('pointerdown', tap)
      window.clearTimeout(dwell)
      window.clearTimeout(away)
    }
  }, [hero])

  // The swing follows the hold, frame by frame, while it's moving. Once it's all over, CSS swings it shut.
  useEffect(() => {
    const door = root.current
    if (!door) return
    if (phase !== 'holding') {
      door.style.setProperty('--open', phase === 'open' || phase === 'leaving' ? '1' : '0')
      return
    }
    return club.onTick(() => door.style.setProperty('--open', club.progress.toFixed(3)))
  }, [phase])

  // A shared link (/#club) opens the door by itself.
  useEffect(() => {
    if (window.location.hash !== '#club') return
    const timer = window.setTimeout(() => club.invite(), 1100)
    return () => window.clearTimeout(timer)
  }, [])

  const inside = phase === 'open' || phase === 'leaving'
  const note = phase === 'closed' || phase === 'leaving' ? NOTES.door : NOTES[phase]

  return (
    <div ref={root} className="club-door" data-phase={phase}>
      <span className="club-door-leak" aria-hidden />
      <div className="club-door-scene" aria-hidden>
        <span className="club-door-spill" />
        <div className="club-door-way">
          <div className="club-door-inside">
            {!closed &&
              DANCERS.map((dancer) => (
                <span
                  key={dancer.cell}
                  className="club-door-dancer"
                  style={
                    {
                      left: dancer.left,
                      width: dancer.size,
                      maskPosition: cellPosition(dancer.cell),
                      WebkitMaskPosition: cellPosition(dancer.cell),
                      animationDelay: `${dancer.delay}s`,
                    } as CSSProperties
                  }
                />
              ))}
          </div>
          <div className="club-door-panel">
            <span className="club-door-window" />
            <Mark name="emblem" className="club-door-plaque" />
            <span className="club-door-knob" />
          </div>
        </div>
        <svg className="club-door-frame" viewBox="0 0 100 142">
          <path d="M7 141 L6.5 54 C6 27 25 9 50 8.5 C75 9 94 27 93.5 54 L93 141" />
          <path className="club-door-frame-echo" d="M10.5 139 L10.5 56 C11 31 28 13.5 50 13 C72 13.5 89 31 89.5 56 L89.5 139" />
        </svg>
        <svg className="club-door-rope" viewBox="0 0 124 58">
          <g className="club-door-rope-line">
            <path d="M12 14 Q62 46 112 14" stroke="var(--orange)" strokeWidth="5" strokeLinecap="round" fill="none" />
            <path d="M12 14 Q62 46 112 14" stroke="var(--charcoal)" strokeWidth="5" strokeLinecap="round" strokeDasharray="1 7" opacity="0.3" fill="none" />
          </g>
          {[12, 112].map((x) => (
            <g key={x} transform={`translate(${x} 0)`}>
              <rect x="-2.5" y="14" width="5" height="42" fill="var(--stone)" />
              <circle cy="12" r="5.5" fill="var(--cream)" />
              <ellipse cy="56" rx="11" ry="2.5" fill="var(--stone)" />
            </g>
          ))}
        </svg>
        <Mark name="mascot" className="club-door-bouncer" />
        <span key={note} className="club-door-note hand">
          {note}
        </span>
      </div>
      <button
        type="button"
        className="club-door-hit"
        aria-label="A door with music behind it. Press and hold to go in."
        disabled={inside}
        onFocus={() => club.reveal()}
        onBlur={() => club.hold(false)}
        onPointerEnter={(event) => event.pointerType === 'mouse' && club.hold(true)}
        onPointerLeave={(event) => event.pointerType === 'mouse' && club.hold(false)}
        onPointerDown={(event) => {
          if (event.pointerType === 'mouse') return
          // Keeps the press on the door even if the finger drifts off it.
          if (event.currentTarget.hasPointerCapture?.(event.pointerId) === false) {
            try {
              event.currentTarget.setPointerCapture(event.pointerId)
            } catch {
              // The pointer's already gone.
            }
          }
          club.hold(true)
        }}
        onPointerUp={(event) => event.pointerType !== 'mouse' && club.hold(false)}
        onPointerCancel={() => club.hold(false)}
        onKeyDown={(event) => {
          if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
            event.preventDefault()
            club.hold(true)
          }
        }}
        onKeyUp={(event) => {
          if (event.key === ' ' || event.key === 'Enter') club.hold(false)
        }}
        onContextMenu={(event) => event.preventDefault()}
      />
    </div>
  )
}
