import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, type Sprite, type SpriteMaterial } from 'three'
import { useLampLevel } from './lampLevel'
import { TABLE_LAMP, type Layout } from './layout'
import { hazeTexture } from './textures'

type Source = 'floor' | 'table' | 'room'

interface Puff {
  /** The light it hangs in: it only shows while that light is on. */
  source: Source
  /** From the lamp (scaled with it), or from the middle of the room. */
  offset: [number, number, number]
  size: number
  opacity: number
  /** How far and how fast it wanders, and how fast it turns. */
  drift: number
  speed: number
  spin: number
  phase: number
}

// The first four are the ones that matter; lighter devices draw only those.
const PUFFS: Puff[] = [
  { source: 'floor', offset: [-0.2, 1.3, 0.4], size: 2.4, opacity: 0.32, drift: 0.25, speed: 0.13, spin: 0.03, phase: 0 },
  { source: 'table', offset: [0.1, 1.05, 0.1], size: 1.9, opacity: 0.28, drift: 0.2, speed: 0.17, spin: -0.04, phase: 2 },
  { source: 'room', offset: [-2.7, 2.7, -1.9], size: 3.6, opacity: 0.15, drift: 0.4, speed: 0.08, spin: 0.02, phase: 4 },
  { source: 'room', offset: [2.9, 3.2, -2.1], size: 3.8, opacity: 0.13, drift: 0.4, speed: 0.07, spin: -0.02, phase: 1 },
  { source: 'floor', offset: [0.35, 2.5, 0.1], size: 2.8, opacity: 0.22, drift: 0.2, speed: 0.11, spin: -0.03, phase: 3 },
  { source: 'table', offset: [0.8, 1.45, -0.5], size: 2.6, opacity: 0.16, drift: 0.3, speed: 0.1, spin: 0.03, phase: 5 },
  { source: 'room', offset: [0.4, 3.9, -1.3], size: 4.2, opacity: 0.1, drift: 0.5, speed: 0.06, spin: 0.015, phase: 2.5 },
  { source: 'floor', offset: [-0.5, 0.6, 0.7], size: 2.2, opacity: 0.18, drift: 0.2, speed: 0.15, spin: 0.04, phase: 6 },
]

interface HazeProps {
  layout: Layout
  lamps: { floor: boolean; table: boolean }
  /** How many puffs to draw. */
  count: number
  reducedMotion: boolean
}

/**
 * Haze hanging in the lamplight, drifting and turning slowly. Each puff belongs to a lamp and fades with it, so
 * switching a lamp off clears its air; the room's own haze dims to what the screen lights.
 */
export function Haze({ layout, lamps, count, reducedMotion }: HazeProps) {
  const texture = useMemo(() => hazeTexture(), [])
  const puffs = useRef<(Sprite | null)[]>([])
  const floor = useLampLevel(lamps.floor, reducedMotion)
  const table = useLampLevel(lamps.table, reducedMotion, 3.4)

  useFrame(({ clock }, delta) => {
    const t = reducedMotion ? 0 : clock.elapsedTime
    const lit = { floor: floor(clock.elapsedTime, delta), table: table(clock.elapsedTime, delta) }
    const glow = {
      floor: lit.floor.power * lit.floor.level,
      table: lit.table.power * lit.table.level,
      room: 0.3 + 0.35 * (lit.floor.power + lit.table.power),
    }
    const { position: lamp, scale } = layout.lamp
    PUFFS.slice(0, count).forEach((puff, i) => {
      const sprite = puffs.current[i]
      if (!sprite) return
      const [x, y, z] = puff.offset
      const wander = Math.sin(t * puff.speed + puff.phase) * puff.drift
      const bob = Math.sin(t * puff.speed * 0.7 + puff.phase * 2) * 0.08
      if (puff.source === 'floor') sprite.position.set(lamp[0] + x * scale + wander, y * scale + bob, lamp[2] + z * scale)
      else if (puff.source === 'table') sprite.position.set(TABLE_LAMP[0] + x + wander, TABLE_LAMP[1] + y + bob, TABLE_LAMP[2] + z)
      else sprite.position.set(x + wander, y + bob, z)
      const material = sprite.material as SpriteMaterial
      material.rotation = puff.phase + t * puff.spin
      material.opacity = puff.opacity * glow[puff.source]
    })
  })

  return PUFFS.slice(0, count).map((puff, i) => (
    <sprite
      key={`${puff.source}${puff.phase}`}
      ref={(sprite) => {
        puffs.current[i] = sprite
      }}
      scale={[puff.size, puff.size, 1]}
    >
      <spriteMaterial map={texture} color="#ffb070" opacity={0} transparent depthWrite={false} blending={AdditiveBlending} />
    </sprite>
  ))
}
