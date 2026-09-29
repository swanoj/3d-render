import { NEEDLE_DROP } from '../../lib/casaSound'

/*
 * The turntable's geometry, in metres, after a classic direct-drive club deck: the spindle at the origin, the
 * tonearm's pivot behind and to the right of it. The arm is modelled pointing straight ahead (+z) and swings about
 * the vertical; a swing of 0 puts it on its rest.
 */

export const PIVOT = { x: 0.165, z: -0.138 }
/** Pivot to stylus. */
export const ARM_LENGTH = 0.23
/** The arm tube's height above the plinth, and the record's top surface. */
export const ARM_HEIGHT = 0.036
export const RECORD_TOP = 0.018
/** How far the cue lifts the arm (radians of pitch): the stylus clears the record by about 8 mm. */
export const LIFT_ANGLE = 0.035
/** The headshell's offset angle, turning the cartridge in towards the spindle. */
export const HEADSHELL_OFFSET = -0.35

const PIVOT_TO_SPINDLE = Math.hypot(PIVOT.x, PIVOT.z)
/** The swing that points the arm at the spindle. */
const TO_SPINDLE = Math.atan2(-PIVOT.x, -PIVOT.z)

/** The swing that puts the stylus `radius` metres from the spindle. */
function swingFor(radius: number) {
  const cos = (PIVOT_TO_SPINDLE ** 2 + ARM_LENGTH ** 2 - radius ** 2) / (2 * PIVOT_TO_SPINDLE * ARM_LENGTH)
  return TO_SPINDLE + Math.acos(Math.min(1, Math.max(-1, cos)))
}

export const REST = 0
/** The first groove of a 12-inch record, and the run-out near the label. */
const LEAD_IN = swingFor(0.146)
const RUN_OUT = swingFor(0.062)

/** Where the arm sits `progress` (0–1) of the way across the record. */
export function trackSwing(progress: number) {
  return LEAD_IN + (RUN_OUT - LEAD_IN) * progress
}

export interface Pose {
  /** Radians about the vertical, from straight ahead. */
  swing: number
  /** 0 with the needle down (or the arm on its rest), 1 fully cued up. */
  lift: number
}

// The cue: up, across and down, taking the needle drop's time in all.
const LIFT = 0.25
const LOWER = 0.25
const ACROSS = NEEDLE_DROP - LIFT - LOWER

const ease = (t: number) => t * t * (3 - 2 * t)

/** Where the arm is `elapsed` seconds into a move from `from` to the swing `to`. */
export function armPose(elapsed: number, from: Pose, to: number): Pose {
  if (elapsed <= 0) return from
  if (elapsed < LIFT) return { swing: from.swing, lift: from.lift + (1 - from.lift) * ease(elapsed / LIFT) }
  if (elapsed < LIFT + ACROSS) {
    return { swing: from.swing + (to - from.swing) * ease((elapsed - LIFT) / ACROSS), lift: 1 }
  }
  if (elapsed < NEEDLE_DROP) return { swing: to, lift: 1 - ease((elapsed - LIFT - ACROSS) / LOWER) }
  return { swing: to, lift: 0 }
}
