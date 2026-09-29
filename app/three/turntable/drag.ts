import type { ThreeEvent } from '@react-three/fiber'
import { Plane, Vector3, type Object3D } from 'three'

/*
 * Dragging the desk's controls: the arm, the record, the faders and knobs. The pointer is captured when a control
 * is pressed, so it follows the pointer anywhere until it's let go, and the page doesn't scroll under a finger
 * that's playing a record.
 */

/** How many controls are being dragged right now. */
export const dragging = { count: 0 }

interface Capture {
  setPointerCapture(id: number): void
  releasePointerCapture(id: number): void
}

/** R3F's stand-in for the DOM's target, which captures the pointer for the 3D object. */
const target = (event: ThreeEvent<PointerEvent>) => event.target as unknown as Capture

/** Takes hold of a control with this pointer: it gets the pointer's moves until it's let go. */
export function grab(event: ThreeEvent<PointerEvent>) {
  event.stopPropagation()
  target(event).setPointerCapture(event.pointerId)
  dragging.count += 1
}

/** Lets go of a control. */
export function release(event: ThreeEvent<PointerEvent>) {
  dragging.count = Math.max(0, dragging.count - 1)
  target(event).releasePointerCapture(event.pointerId)
}

const plane = new Plane()
const normal = new Vector3()
const origin = new Vector3()

/**
 * Where the pointer meets a level plane `height` above `space`'s origin, in `space`'s own coordinates: written
 * into `into`, or null when the pointer's looking away from the plane.
 */
export function pointerOn(event: ThreeEvent<PointerEvent>, space: Object3D, height: number, into: Vector3) {
  space.updateWorldMatrix(true, false)
  normal.set(0, 1, 0).transformDirection(space.matrixWorld)
  origin.set(0, height, 0).applyMatrix4(space.matrixWorld)
  plane.setFromNormalAndCoplanarPoint(normal, origin)
  if (!event.ray.intersectPlane(plane, into)) return null
  return space.worldToLocal(into)
}
