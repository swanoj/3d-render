import { NEEDLE_DROP, NEEDLE_LOWER } from '../../lib/casaSound'

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
/** The record's radius, and the label's. */
export const RECORD_RADIUS = 0.151
export const LABEL_RADIUS = 0.05

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
/** How far the arm swings by hand: from just past its rest to near the spindle. */
export const SWING_MIN = swingFor(0.03)
export const SWING_MAX = 0.03

/** Where the arm sits `progress` (0–1) of the way across the record. */
export function trackSwing(progress: number) {
  return LEAD_IN + (RUN_OUT - LEAD_IN) * progress
}

/** Where the stylus is (on the plinth, from the spindle) at a swing. */
export function stylusAt(swing: number) {
  return { x: PIVOT.x + Math.sin(swing) * ARM_LENGTH, z: PIVOT.z + Math.cos(swing) * ARM_LENGTH }
}

/** The swing that points the arm at a point on the plinth. */
export function swingToward(x: number, z: number) {
  return Math.atan2(x - PIVOT.x, z - PIVOT.z)
}

/**
 * How far across the record (0–1) the needle would land at a swing, or null if it would miss the grooves: off the
 * edge, or on the label.
 */
export function grooveAt(swing: number) {
  const { x, z } = stylusAt(swing)
  const radius = Math.hypot(x, z)
  if (radius > RECORD_RADIUS + 0.002 || radius < LABEL_RADIUS + 0.004) return null
  return Math.min(1, Math.max(0, (swing - LEAD_IN) / (RUN_OUT - LEAD_IN)))
}

export interface Pose {
  /** Radians about the vertical, from straight ahead. */
  swing: number
  /** 0 with the needle down (or the arm on its rest), 1 fully cued up. */
  lift: number
}

// The cue: up, across and down, taking the needle drop's time in all.
const LIFT = 0.25
const ACROSS = NEEDLE_DROP - LIFT - NEEDLE_LOWER
/** How quickly the arm comes up off the record when the DJ takes hold of it. */
const GRAB = 0.12

const ease = (t: number) => t * t * (3 - 2 * t)

/** Where the arm is `elapsed` seconds into a cue from `from` to the swing `to`: up, across and down. */
export function armPose(elapsed: number, from: Pose, to: number): Pose {
  if (elapsed <= 0) return from
  if (elapsed < LIFT) return { swing: from.swing, lift: from.lift + (1 - from.lift) * ease(elapsed / LIFT) }
  if (elapsed < LIFT + ACROSS) {
    return { swing: from.swing + (to - from.swing) * ease((elapsed - LIFT) / ACROSS), lift: 1 }
  }
  if (elapsed < NEEDLE_DROP) return { swing: to, lift: 1 - ease((elapsed - LIFT - ACROSS) / NEEDLE_LOWER) }
  return { swing: to, lift: 0 }
}

/** The DJ lowering the arm from `from` onto the swing `to` by hand: just down, in `NEEDLE_LOWER`. */
export function lowerPose(elapsed: number, from: Pose, to: number): Pose {
  const t = ease(Math.min(1, Math.max(0, elapsed / NEEDLE_LOWER)))
  return { swing: from.swing + (to - from.swing) * t, lift: from.lift * (1 - t) }
}

/** How far up the arm is `elapsed` seconds after the DJ took hold of it at `from`. */
export function grabLift(elapsed: number, from: Pose) {
  return from.lift + (1 - from.lift) * ease(Math.min(1, Math.max(0, elapsed / GRAB)))
}

/** The page's clock in milliseconds, which the decks' moves are timed by (the same as the sound's). */
export function pageTime() {
  return performance.now()
}
