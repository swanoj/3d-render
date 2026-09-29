import type { Mix } from '../../content/types'
import type { DeckIndex } from '../../lib/casaSound'

/*
 * The DJ desk's floor plan, in metres: the desk top at y = 0, x along the desk, z towards the viewer. The booth
 * fills the screen, so its shape follows the screen's: landscape gets both decks with the mixer between them and
 * the crate at the end; a squarer screen drops the second deck; a phone held upright gets deck 1 at the front with
 * the crate behind it, so both are big in a tall frame. The camera frames whatever the layout holds.
 */

export type DeskLayoutId = 'wide' | 'medium' | 'tall'

/** Where something stands on the desk (x along it, z towards the viewer), and which way it's turned. */
interface Spot {
  x: number
  z: number
  turn: number
}

export interface DeskLayout {
  id: DeskLayoutId
  /** The headphones, off to one side (none on a phone). */
  headphones: Spot | null
  /** The decks' spindles along the desk (the second deck on landscape screens only), and how far forward. */
  deckA: number
  deckB: number | null
  deckZ: number
  mixer: number | null
  crate: Spot
  /** The neon sign on the wall behind: where, how high and how big (1 = 95 cm across). */
  sign: { x: number; y: number; scale: number }
  /** The stretch of desk the camera keeps across the frame from low down, and from overhead. */
  span: [number, number]
  overhead: [number, number]
  /** The camera's vertical field of view (degrees): wider on tall screens, so the kit still fills the width. */
  fov: number
  /** Where the camera looks, low down and overhead (height and depth), and how steeply it looks down overhead. */
  aim: { low: [number, number]; over: [number, number] }
  tilt: number
}

const LAYOUTS: Record<DeskLayoutId, DeskLayout> = {
  wide: {
    id: 'wide',
    headphones: { x: -0.1, z: -0.34, turn: 0.12 },
    deckA: -0.56,
    deckB: 0.3,
    deckZ: 0,
    mixer: -0.1,
    crate: { x: 0.8, z: 0.03, turn: 0 },
    sign: { x: 0.1, y: 0.44, scale: 1.1 },
    span: [-0.8, 1.02],
    overhead: [-0.82, 1.08],
    fov: 30,
    aim: { low: [0.2, 0], over: [0.07, -0.03] },
    tilt: 1.02,
  },
  medium: {
    id: 'medium',
    headphones: { x: 0.1, z: -0.34, turn: 0.12 },
    deckA: -0.36,
    deckB: null,
    deckZ: 0,
    mixer: 0.1,
    crate: { x: 0.5, z: 0.03, turn: 0 },
    sign: { x: 0.08, y: 0.44, scale: 0.9 },
    span: [-0.58, 0.72],
    overhead: [-0.6, 0.76],
    fov: 36,
    aim: { low: [0.2, 0], over: [0.07, -0.03] },
    tilt: 1.08,
  },
  tall: {
    id: 'tall',
    headphones: null,
    deckA: -0.02,
    deckB: null,
    deckZ: 0.16,
    mixer: null,
    crate: { x: 0.02, z: -0.4, turn: 0 },
    sign: { x: 0.02, y: 0.56, scale: 0.55 },
    span: [-0.36, 0.4],
    overhead: [-0.3, 0.34],
    fov: 46,
    aim: { low: [0.26, -0.08], over: [0.08, -0.12] },
    tilt: 1.18,
  },
}

/** The layout for a screen of this width-to-height ratio. */
export function deskLayout(aspect: number) {
  if (aspect >= 1.25) return LAYOUTS.wide
  if (aspect >= 0.85) return LAYOUTS.medium
  return LAYOUTS.tall
}

/**
 * How long a record takes from the crate to a deck, in milliseconds: up out of its sleeve, across, and down onto
 * the platter. The needle drops after it lands.
 */
export const FLIGHT_MS = 1150

/** A record on its way between the crate and a deck. */
export interface Flight {
  /** Tells flights apart. */
  id: number
  /** The record, and its place in the crate. */
  mix: Mix
  slot: number
  deck: DeckIndex
  /** Out of the crate onto the deck, or off the deck back into its sleeve. */
  way: 'in' | 'out'
  /** When it leaves (`performance.now()`). */
  start: number
}

/**
 * Keeps the desk's canvas drawing for a while after something moves (a hover, a click, a scroll). The canvas only
 * draws on demand; the turntable keeps it going while a record spins.
 */
export const deskActivity = { until: 0 }

export function keepDrawing(ms = 1200) {
  deskActivity.until = Math.max(deskActivity.until, performance.now() + ms)
}

/**
 * Seconds on the page's own clock. The desk times its animations by this rather than the 3D clock, which starts
 * again from zero whenever drawing pauses (while the booth is off screen).
 */
export function seconds() {
  return performance.now() / 1000
}
