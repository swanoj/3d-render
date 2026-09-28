import { useRef } from 'react'
import { MathUtils } from 'three'
import { casaSound } from '../../lib/casaSound'
import { breath } from './layout'

/**
 * How lit a lamp is, for use inside `useFrame`: call the returned function with the clock's time and the frame's
 * delta. `power` (0–1) follows the switch like an incandescent bulb, quick to warm up and a little slower to fade.
 * `level` is the slow breath of the room's light, offset by `phase`, and with the sound on it swells slightly with
 * each kick from next door, never enough to flash.
 */
export function useLampLevel(on: boolean, reducedMotion: boolean, phase = 0) {
  const power = useRef(on ? 1 : 0)
  return (time: number, rawDelta: number) => {
    const delta = Math.min(rawDelta, 0.1)
    power.current = reducedMotion ? (on ? 1 : 0) : MathUtils.damp(power.current, on ? 1 : 0, on ? 9 : 5, delta)
    const beat = reducedMotion ? 0 : casaSound.pulse()
    return { power: power.current, level: breath((reducedMotion ? 2 : time) + phase) * (1 + 0.12 * beat) }
  }
}
