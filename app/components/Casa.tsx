import { useEffect, useRef, useState } from 'react'
import { brand } from '../brand/brand'
import { useReducedMotion } from '../lib/hooks'
import { Mark } from './Mark'

/** Walking pace, in pixels a second. */
const PACE = 38
/** How long Casa stays off stage after walking off one side. */
const OFFSTAGE: [number, number] = [3000, 7000]
/** How long between stops to look around. */
const STROLL: [number, number] = [5000, 11000]
/** How long a stop lasts. */
const STOP: [number, number] = [1800, 3400]

const between = ([low, high]: [number, number]) => low + Math.random() * (high - low)

type Mode = 'walk' | 'stop' | 'offstage'

/**
 * Casa, the Club Casa mascot (previously Otto), walking along the bottom edge of the screen: small, unhurried and
 * mostly out of the way. Now and then Casa stops to look around, sometimes turns back, and walks off one side to come
 * back a little later. Tapping Casa gets a hop and a hello. The walk is a stepped, two-pose waddle, like an old GIF.
 * Under reduced motion Casa sits still in the corner.
 */
export function Casa() {
  const reducedMotion = useReducedMotion()
  const walker = useRef<HTMLDivElement>(null)
  const [hello, setHello] = useState(0)

  useEffect(() => {
    const element = walker.current
    if (!element || reducedMotion) return
    const size = () => element.offsetWidth || 44
    let x = -size()
    let direction: 1 | -1 = 1
    let mode: Mode = 'walk'
    let until = performance.now() + between(STROLL)
    let last = performance.now()
    let frame = 0

    const show = () => {
      element.dataset.mode = mode
      element.dataset.facing = direction > 0 ? 'right' : 'left'
    }
    show()

    const tick = (now: number) => {
      const seconds = Math.min(0.05, (now - last) / 1000)
      last = now
      const width = document.documentElement.clientWidth
      const body = size()
      if (mode === 'walk') {
        x += direction * PACE * seconds
        if ((direction > 0 && x > width + 8) || (direction < 0 && x < -body - 8)) {
          // Off stage: wait a little, then come back on from the side Casa left by.
          mode = 'offstage'
          until = now + between(OFFSTAGE)
          direction = direction > 0 ? -1 : 1
          show()
        } else if (now > until && x > body && x < width - body * 2) {
          mode = 'stop'
          until = now + between(STOP)
          show()
        }
      } else if (now > until) {
        // After a stop, sometimes back the way Casa came.
        if (mode === 'stop' && Math.random() < 0.3) direction = direction > 0 ? -1 : 1
        mode = 'walk'
        until = now + between(STROLL)
        show()
      }
      element.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0)`
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [reducedMotion])

  return (
    <div className="casa" aria-hidden data-still={reducedMotion || undefined}>
      <div ref={walker} className="casa-walker" data-mode="walk" data-facing="right">
        <button
          type="button"
          tabIndex={-1}
          className="casa-body"
          // Restarting the hop each tap: the key changes, so the animation runs again.
          key={hello}
          data-hello={hello ? true : undefined}
          onClick={() => setHello(Date.now())}
        >
          <Mark name="mascot" className="casa-mark" />
        </button>
        {hello > 0 && (
          <span key={`say-${hello}`} className="casa-hello hand">
            hi, I’m {brand.mascot.name}
          </span>
        )}
      </div>
    </div>
  )
}
