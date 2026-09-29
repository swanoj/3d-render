/*
 * The DJ desk's floor plan, in metres: the desk top at y = 0, x along the desk, z towards the viewer. Wide bars (a
 * desktop's lower third) get the whole booth; narrower ones drop the second deck, then the mixer, so what stays is
 * big enough to read. The camera frames whatever the layout holds.
 */

export type DeskLayoutId = 'wide' | 'medium' | 'narrow'

export interface DeskLayout {
  id: DeskLayoutId
  headphones: number
  /** The playing deck's spindle, and the second deck's (none on smaller screens). */
  deckA: number
  deckB: number | null
  mixer: number | null
  crate: number
  /** The neon sign on the wall behind: where, and how big (1 = 95 cm across). */
  sign: { x: number; scale: number }
  /** The stretch of desk the camera keeps in frame. */
  span: [number, number]
}

const LAYOUTS: Record<DeskLayoutId, DeskLayout> = {
  wide: {
    id: 'wide',
    headphones: -0.98,
    deckA: -0.56,
    deckB: 0.3,
    mixer: -0.1,
    crate: 0.8,
    sign: { x: -0.06, scale: 1 },
    span: [-1.12, 1.0],
  },
  medium: {
    id: 'medium',
    headphones: -0.78,
    deckA: -0.36,
    deckB: null,
    mixer: 0.1,
    crate: 0.5,
    sign: { x: -0.1, scale: 0.85 },
    span: [-0.9, 0.7],
  },
  narrow: {
    id: 'narrow',
    headphones: -0.5,
    deckA: -0.12,
    deckB: null,
    mixer: null,
    crate: 0.39,
    sign: { x: -0.1, scale: 0.6 },
    span: [-0.36, 0.58],
  },
}

/** The layout for a bar of this width-to-height ratio. */
export function deskLayout(aspect: number) {
  if (aspect >= 3.6) return LAYOUTS.wide
  if (aspect >= 2.2) return LAYOUTS.medium
  return LAYOUTS.narrow
}

/** How far a record flies from the crate to the deck, in milliseconds (the disc lands, then the needle drops). */
export const FLIGHT_MS = 950

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
 * again from zero whenever drawing pauses (while the Casa TV room has the screen).
 */
export function seconds() {
  return performance.now() / 1000
}
