import { MathUtils } from 'three'

/** The set's proportions, in scene units (roughly metres). */
export const TV = { width: 2.5, height: 1.85, depth: 1.1, legs: 0.42 }
export const TOP_Y = TV.legs + TV.height
export const CENTRE_Y = TV.legs + TV.height / 2
export const FRONT_Z = 0.75
export const SCREEN_X = -0.3
export const SCREEN_SIZE = { width: 1.56, height: 1.17 }
export const CONTROLS_X = 0.82
export const FOV = 30

type Vec3 = [number, number, number]

/** The mushroom lamp on top of the set. */
export const TABLE_LAMP: Vec3 = [-0.8, TOP_Y, 0.15]

export interface Shot {
  position: Vec3
  target: Vec3
}

export interface Layout {
  portrait: boolean
  /** Where the camera starts as the section scrolls in: the whole corner. */
  wide: Shot
  /** Where it settles: close on the set. */
  close: Shot
  lamp: { position: Vec3; scale: number }
  plant: { position: Vec3; scale: number }
  crate: { position: Vec3; rotation: number }
}

/**
 * Framing for the screen shape. Wide screens settle with the set filling about 60% of the width and the lamp and
 * plant at the edges. Tall screens close in until the cabinet runs edge to edge, and stand the lamp and plant just
 * behind it so they still show around the set.
 */
export function layoutFor(aspect: number): Layout {
  const tan = Math.tan(MathUtils.degToRad(FOV / 2))
  if (aspect < 1) {
    const distance = 2.25 / aspect / (2 * tan)
    return {
      portrait: true,
      close: { position: [-0.1, CENTRE_Y + 0.55, FRONT_Z + distance], target: [-0.1, CENTRE_Y + 0.3, 0] },
      wide: { position: [-0.9, 2.9, FRONT_Z + distance + 5], target: [0, 1.7, -0.8] },
      lamp: { position: [1.35, 0, -1.8], scale: 1.3 },
      plant: { position: [-1.35, 0, -1.6], scale: 1.25 },
      crate: { position: [1.1, 0, 1.35], rotation: -0.5 },
    }
  }
  const visibleHeight = Math.max(2.5 / 0.6 / aspect, 2.8)
  const distance = visibleHeight / (2 * tan)
  return {
    portrait: false,
    close: { position: [0, CENTRE_Y + 0.3, FRONT_Z + distance], target: [-0.05, CENTRE_Y + 0.02, 0] },
    wide: { position: [-1.8, 2.8, FRONT_Z + distance + 6.5], target: [0, 1.5, -0.9] },
    lamp: { position: [2.35, 0, -0.55], scale: 1 },
    plant: { position: [-2.4, 0, -0.45], scale: 1 },
    crate: { position: [1.9, 0, 0.95], rotation: -0.35 },
  }
}

/** How bright the room's lamps are: a slow breath, never a flash. */
export function breath(time: number) {
  const wave = 0.5 + 0.5 * Math.sin(time * 0.62)
  return 0.55 + 0.45 * wave * wave
}
