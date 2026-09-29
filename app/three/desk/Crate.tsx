import { useCursor } from '@react-three/drei'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { MathUtils, MeshPhysicalMaterial, MeshStandardMaterial, Vector3, type Group } from 'three'
import type { MoodId } from '../../brand/brand'
import type { Mix } from '../../content/types'
import type { TvAssets } from '../channels'
import { recordLabelTexture, vinylMaps } from '../turntable/textures'
import { FLIGHT_MS, keepDrawing, seconds } from './layout'
import { mixSleeveTexture, pineTexture, sleeveBackTexture, sleeveTexture } from './textures'

const CRATE = { width: 0.36, depth: 0.4, side: 0.2, wall: 0.12, board: 0.013 }
const SLEEVE = 0.314
const FRONT_Z = CRATE.depth / 2 - 0.036
const GAP = 0.03
/** How long a record takes to change places in the crate, in seconds. */
const SHUFFLE = 0.62
/** Records at the back that aren't for browsing: they just fill the crate. */
const BACKSTOCK: { title: string; mood: MoodId }[] = [
  { title: 'Casa records 005', mood: 'red' },
  { title: 'Casa records 006', mood: 'charcoal' },
  { title: 'Casa records 007', mood: 'cream' },
]

const ease = (t: number) => t * t * (3 - 2 * t)
const jitter = (i: number) => Math.sin(i * 12.9898) * 0.006

interface Flight {
  index: number
  /** `performance.now()` when the disc leaves its sleeve. */
  start: number
}

interface CrateProps {
  position: [number, number, number]
  records: Mix[]
  selected: number
  flight: Flight | null
  assets: TvAssets | null
  /** Seconds before the records drop in, for the intro. */
  delay: number
  onFlip: () => void
  onPlay: (index: number) => void
  /** Updated each frame with the front record's top edge, in world space, for the controls drawn over it. */
  anchor: RefObject<Vector3>
}

/**
 * A pine crate of records. The front one faces you; tap the crate to send it over the others to the back and bring
 * the next forward, as you'd flick through in a record shop. The front record's disc peeks out when you point at
 * it; tap it to play.
 */
export function Crate({ position, records, selected, flight, assets, delay, onFlip, onPlay, anchor }: CrateProps) {
  const invalidate = useThree((state) => state.invalidate)
  const sleeves = useRef<(Group | null)[]>([])
  const discs = useRef<(Group | null)[]>([])
  const motion = useRef(records.map((_, i) => ({ k: i, from: i, to: i, start: 0 })))
  const born = useRef(-1)
  const [hovered, setHovered] = useState<number | null>(null)
  useCursor(hovered !== null)

  const made = useMemo(() => {
    const pine = pineTexture()
    return {
      pine: new MeshStandardMaterial({ map: pine, roughness: 0.78 }),
      pineEnd: new MeshStandardMaterial({ map: pine, roughness: 0.78, color: '#e8d2b4' }),
      edge: new MeshStandardMaterial({ color: '#d9cdbd', roughness: 0.85 }),
      vinyl: new MeshPhysicalMaterial({ color: '#0b0b0c', roughness: 0.3, clearcoat: 0.5, clearcoatRoughness: 0.2 }),
    }
  }, [])
  const faces = useMemo(
    () =>
      records.map(
        (mix, i) =>
          new MeshStandardMaterial({ map: mixSleeveTexture(mix, assets, i + 1), roughness: 0.72 }),
      ),
    [records, assets],
  )
  const backs = useMemo(
    () => records.map((mix) => new MeshStandardMaterial({ map: sleeveBackTexture(mix.sleeve ?? 'orange'), roughness: 0.8 })),
    [records],
  )
  const stock = useMemo(
    () =>
      BACKSTOCK.map(
        (record, j) =>
          new MeshStandardMaterial({
            map: sleeveTexture(record.title, 'Casa residents', record.mood, assets, 20 + j),
            roughness: 0.75,
          }),
      ),
    [assets],
  )
  useEffect(() => () => faces.forEach((face) => face.map?.dispose()), [faces])
  useEffect(() => () => stock.forEach((face) => face.map?.dispose()), [stock])

  useEffect(() => {
    keepDrawing(SHUFFLE * 1000 + 200)
    invalidate()
  }, [selected, invalidate])

  useFrame((state) => {
    const now = seconds()
    if (born.current < 0) born.current = now
    const count = records.length
    let moving = false
    records.forEach((_, i) => {
      const sleeve = sleeves.current[i]
      const m = motion.current[i]
      if (!sleeve || !m) return
      const slot = (i - selected + count) % count
      if (slot !== m.to) {
        m.from = m.k
        m.to = slot
        m.start = now
      }
      const t = MathUtils.clamp((now - m.start) / SHUFFLE, 0, 1)
      m.k = m.from + (m.to - m.from) * ease(t)
      // A record changing ends of the crate lifts clear over the others.
      const arc = Math.abs(m.to - m.from) >= 2 ? Math.sin(Math.PI * t) * 0.36 : 0
      const drop = dropIn(now - born.current - delay - i * 0.09)
      const front = slot === 0 && t === 1
      const peek = front && hovered === i ? 0.012 : 0
      sleeve.position.set(jitter(i), CRATE.board + arc + drop + peek, FRONT_Z - m.k * GAP)
      sleeve.rotation.x = -0.1 - arc * 0.5
      // The front record's disc slides up out of its sleeve when you point at it.
      const disc = discs.current[i]
      if (disc) {
        const out = SLEEVE / 2 + (front && hovered === i ? 0.05 : 0)
        disc.position.y = MathUtils.lerp(disc.position.y, out, 0.25)
        disc.visible = !(flight && flight.index === i)
        if (Math.abs(disc.position.y - out) > 0.0005) moving = true
      }
      if (t < 1 || drop > 0) moving = true
      if (front) {
        sleeve.updateWorldMatrix(true, false)
        anchor.current?.set(0, SLEEVE + 0.012, 0).applyMatrix4(sleeve.matrixWorld)
      }
    })
    BACKSTOCK.forEach((_, j) => {
      const sleeve = sleeves.current[count + j]
      if (!sleeve) return
      const drop = dropIn(now - born.current - delay - (count + j) * 0.09)
      sleeve.position.set(jitter(count + j), CRATE.board + drop, FRONT_Z - (count + j) * GAP)
      if (drop > 0) moving = true
    })
    if (moving) state.invalidate()
  })

  const point = (index: number | null) => (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    setHovered(index)
    keepDrawing()
    invalidate()
  }
  const click = (index: number | null) => (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    keepDrawing()
    if (index !== null && index === selected) onPlay(index)
    else onFlip()
  }

  const { width, depth, side, wall, board } = CRATE
  return (
    <group position={position}>
      {/* The crate: a floor, two solid ends and slatted front and back walls. */}
      <group onClick={click(null)} onPointerOver={point(-1)} onPointerOut={point(null)}>
        <mesh position={[0, board / 2, 0]} material={made.pine} castShadow receiveShadow>
          <boxGeometry args={[width, board, depth]} />
        </mesh>
        {[-1, 1].map((end) => (
          <mesh key={end} position={[end * (width / 2 - 0.007), side / 2, 0]} material={made.pineEnd} castShadow receiveShadow>
            <boxGeometry args={[0.014, side, depth]} />
          </mesh>
        ))}
        {[-1, 1].flatMap((face) =>
          [0.034, 0.094].map((y) => (
            <mesh
              key={`${face}${y}`}
              position={[0, y, face * (depth / 2 - 0.007)]}
              material={made.pine}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[width - 0.028, wall / 2.4, 0.014]} />
            </mesh>
          )),
        )}
      </group>

      {/* The records you can flick through, then the ones filling the back. */}
      {records.map((mix, i) => (
        <group
          key={mix.id}
          ref={(node) => void (sleeves.current[i] = node)}
          onClick={click(i)}
          onPointerOver={point(i)}
          onPointerOut={point(null)}
        >
          <mesh position={[0, SLEEVE / 2, 0]} material={[made.edge, made.edge, made.edge, made.edge, faces[i], backs[i]]} castShadow receiveShadow>
            <boxGeometry args={[SLEEVE, SLEEVE, 0.004]} />
          </mesh>
          <group ref={(node) => void (discs.current[i] = node)} position={[0, SLEEVE / 2, 0]}>
            <mesh rotation-x={Math.PI / 2} material={made.vinyl}>
              <cylinderGeometry args={[0.15, 0.15, 0.0016, 64]} />
            </mesh>
          </group>
        </group>
      ))}
      {BACKSTOCK.map((record, j) => (
        <group key={record.title} ref={(node) => void (sleeves.current[records.length + j] = node)} rotation-x={-0.1}>
          <mesh position={[0, SLEEVE / 2, 0]} material={[made.edge, made.edge, made.edge, made.edge, stock[j], made.edge]} castShadow>
            <boxGeometry args={[SLEEVE, SLEEVE, 0.004]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** How high something still is as it drops in: from 0.4 m, landing `elapsed` = 0.6 s after it starts. */
function dropIn(elapsed: number) {
  if (elapsed >= 0.6) return 0
  if (elapsed <= 0) return 0.4
  const t = elapsed / 0.6
  return (1 - t) ** 3 * 0.4
}

interface FlyingRecordProps {
  flight: Flight | null
  mix: Mix | null
  assets: TvAssets | null
  /** Where the disc starts (inside the front sleeve) and lands (the deck's spindle, at record height). */
  from: RefObject<Vector3>
  to: Vector3
}

/**
 * A record on its way from the crate to the deck: up out of its sleeve, across and down onto the platter, laying
 * itself flat and turning as it goes. The deck shows the new label as it lands.
 */
export function FlyingRecord({ flight, mix, assets, from, to }: FlyingRecordProps) {
  const group = useRef<Group>(null)
  const start = useRef(new Vector3())
  const current = useRef<Flight | null>(null)
  const vinyl = useMemo(() => {
    const maps = vinylMaps()
    return new MeshPhysicalMaterial({
      color: '#0b0b0c',
      roughness: 1,
      roughnessMap: maps.roughness,
      anisotropy: 0.9,
      anisotropyMap: maps.anisotropy,
      clearcoat: 0.3,
    })
  }, [])
  const label = useMemo(() => (mix ? recordLabelTexture(mix, assets) : null), [mix, assets])
  useEffect(() => () => label?.dispose(), [label])

  useFrame((state) => {
    const disc = group.current
    if (!disc) return
    if (!flight) {
      disc.visible = false
      return
    }
    // A new flight starts from the front record's sleeve, wherever the crate has it.
    if (flight !== current.current && from.current) {
      current.current = flight
      start.current.copy(from.current).setY(from.current.y - SLEEVE / 2 - 0.012)
    }
    const t = MathUtils.clamp((performance.now() - flight.start) / FLIGHT_MS, 0, 1)
    if (performance.now() < flight.start) {
      disc.visible = false
      state.invalidate()
      return
    }
    disc.visible = t < 1
    const s = start.current
    const lift = s.y + 0.24
    if (t < 0.3) {
      const u = ease(t / 0.3)
      disc.position.set(s.x, MathUtils.lerp(s.y, lift, u), s.z)
      disc.rotation.set(Math.PI / 2, 0, 0)
    } else if (t < 0.8) {
      const u = ease((t - 0.3) / 0.5)
      disc.position.set(
        MathUtils.lerp(s.x, to.x, u),
        MathUtils.lerp(lift, to.y + 0.12, u) + Math.sin(u * Math.PI) * 0.08,
        MathUtils.lerp(s.z, to.z, u),
      )
      disc.rotation.set((Math.PI / 2) * (1 - u), -u * 2.4, 0)
    } else {
      const u = ease((t - 0.8) / 0.2)
      disc.position.set(to.x, MathUtils.lerp(to.y + 0.12, to.y, u), to.z)
      disc.rotation.set(0, -2.4 - u * 0.6, 0)
    }
    if (t < 1) state.invalidate()
  })

  return (
    <group ref={group} visible={false}>
      <mesh material={vinyl} castShadow>
        <cylinderGeometry args={[0.151, 0.151, 0.0018, 96]} />
      </mesh>
      {label &&
        [1, -1].map((face) => (
          <mesh key={face} position={[0, face * 0.001, 0]} rotation-x={(-face * Math.PI) / 2}>
            <circleGeometry args={[0.05, 48]} />
            <meshStandardMaterial map={label} roughness={0.7} />
          </mesh>
        ))}
    </group>
  )
}
