import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { MathUtils, MeshPhysicalMaterial, MeshStandardMaterial, Vector3, type Group, type Object3D } from 'three'
import type { MoodId } from '../../brand/brand'
import type { Mix } from '../../content/types'
import type { TvAssets } from '../channels'
import { grab, release } from '../turntable/drag'
import { recordLabelTexture, vinylMaps } from '../turntable/textures'
import { FLIGHT_MS, keepDrawing, seconds, type Flight } from './layout'
import { mixSleeveTexture, pineTexture, sleeveBackTexture, sleeveTexture } from './textures'

const CRATE = { width: 0.36, depth: 0.4, side: 0.2, board: 0.013 }
/** The front is low, so records flicked past can flop forward over it. */
const FRONT_WALL = 0.062
const SLEEVE = 0.314
const FRONT_Z = 0.13
const GAP = 0.028
/** How the records lean (radians about their bottom edge): back in the rack, the one you're on, flicked past. */
const STANDING = -0.1
const SHOWING = -0.17
const FLOPPED = 0.62
/** Pixels of drag, or of scroll, to flick one record. */
const FLICK = 34
/** Records at the back that aren't for browsing: they just fill the crate. */
const BACKSTOCK: { title: string; mood: MoodId }[] = [
  { title: 'Casa records 005', mood: 'red' },
  { title: 'Casa records 006', mood: 'charcoal' },
  { title: 'Casa records 007', mood: 'cream' },
]

const ease = (t: number) => t * t * (3 - 2 * t)
const jitter = (i: number) => Math.sin(i * 12.9898) * 0.006

/** Where a record's disc sits in the crate (world space), and how its sleeve leans. */
export interface Slot {
  centre: Vector3
  lean: number
}

interface CrateProps {
  position: [number, number, number]
  records: Mix[]
  selected: number
  flights: Flight[]
  /** Ids of the records on the decks: their sleeves are empty. */
  loaded: string[]
  assets: TvAssets | null
  /** Seconds before the records drop in, for the intro. */
  delay: number
  onFlip: (step: number) => void
  onPlay: (index: number) => void
  /** The pointer's over the crate (so the scroll wheel flicks through it). */
  onHover: (over: boolean) => void
  /** Updated each frame: the front record's top edge, for the controls drawn over it. */
  anchor: RefObject<Vector3>
  /** Updated each frame: where each record's disc is, for the flights. */
  slots: RefObject<Slot[]>
}

/** Which record a part of the crate belongs to, if any. */
function recordOf(object: Object3D | null): number | null {
  for (let node = object; node; node = node.parent) {
    if (typeof node.userData.record === 'number') return node.userData.record
  }
  return null
}

/**
 * A pine crate of records to dig through. The one you're on stands up showing its sleeve; flick on (drag, swipe or
 * scroll over the crate) and it flops forward over the front, showing the next. Past the last, they all go back.
 * Point at the one showing and its disc peeks out; tap it to play.
 */
export function Crate({ position, records, selected, flights, loaded, assets, delay, onFlip, onPlay, onHover, anchor, slots }: CrateProps) {
  const invalidate = useThree((state) => state.invalidate)
  const sleeves = useRef<(Group | null)[]>([])
  const discs = useRef<(Group | null)[]>([])
  const leans = useRef<number[]>(records.map(() => STANDING))
  const born = useRef(-1)
  const [hovered, setHovered] = useState<number | null>(null)
  const [grabbing, setGrabbing] = useState(false)
  /** A drag or swipe over the crate: the pointer, where it last was, how far it's gone and the part it pressed. */
  const gesture = useRef<{ pointer: number; x: number; y: number; moved: number; spare: number; pressed: number | null } | null>(null)

  const cursor = grabbing ? 'grabbing' : hovered === null ? null : hovered === selected ? 'pointer' : 'grab'
  useEffect(() => {
    if (!cursor) return
    document.body.style.cursor = cursor
    return () => {
      document.body.style.cursor = 'auto'
    }
  }, [cursor])

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
    () => records.map((mix, i) => new MeshStandardMaterial({ map: mixSleeveTexture(mix, assets, i + 1), roughness: 0.72 })),
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
    keepDrawing(900)
    invalidate()
  }, [selected, flights, invalidate])

  // Drag or swipe up and down (or across) to flick through; a tap plays the one showing, or flicks on.
  const press = (event: ThreeEvent<PointerEvent>) => {
    if (event.button > 0 || gesture.current) return
    grab(event)
    const { clientX: x, clientY: y } = event.nativeEvent
    gesture.current = { pointer: event.pointerId, x, y, moved: 0, spare: 0, pressed: recordOf(event.object) }
    setGrabbing(true)
  }
  const slide = (event: ThreeEvent<PointerEvent>) => {
    const g = gesture.current
    if (!g || g.pointer !== event.pointerId) return
    event.stopPropagation()
    const { clientX, clientY } = event.nativeEvent
    const up = g.y - clientY
    const left = g.x - clientX
    g.x = clientX
    g.y = clientY
    const step = Math.abs(up) >= Math.abs(left) ? up : left
    g.moved += Math.abs(step)
    g.spare += step
    while (Math.abs(g.spare) >= FLICK) {
      onFlip(Math.sign(g.spare))
      g.spare -= Math.sign(g.spare) * FLICK
    }
  }
  const lift = (event: ThreeEvent<PointerEvent>) => {
    const g = gesture.current
    if (!g || g.pointer !== event.pointerId) return
    gesture.current = null
    release(event)
    setGrabbing(false)
    if (g.moved > 6) return
    if (g.pressed === selected) onPlay(selected)
    else onFlip(1)
  }

  useFrame((state, delta) => {
    const now = seconds()
    const dt = Math.min(delta, 0.05)
    if (born.current < 0) born.current = now
    let moving = false
    records.forEach((mix, i) => {
      const sleeve = sleeves.current[i]
      if (!sleeve) return
      // Flicked past, showing, or waiting its turn.
      const target = i < selected ? FLOPPED - (selected - 1 - i) * 0.012 : i === selected ? SHOWING : STANDING
      const lean = MathUtils.damp(leans.current[i] ?? STANDING, target, 13, dt)
      leans.current[i] = lean
      const drop = dropIn(now - born.current - delay - i * 0.09)
      // A record going to a deck comes up a little with its disc as it's pulled out, then settles back.
      const flight = flights.find((candidate) => candidate.slot === i)
      const t = flight ? (performance.now() - flight.start) / FLIGHT_MS : 1
      const pull = flight?.way === 'in' && t > 0 && t < 0.5 ? Math.sin(Math.PI * Math.min(1, t / 0.5)) * 0.06 : 0
      sleeve.position.set(jitter(i), CRATE.board + drop + pull, FRONT_Z - i * GAP)
      sleeve.rotation.x = lean
      // The disc: inside, unless it's on a deck or on its way; peeking out when you point at it.
      const disc = discs.current[i]
      if (disc) {
        const out = SLEEVE / 2 + (i === selected && hovered === i ? 0.05 : 0)
        disc.position.y = MathUtils.lerp(disc.position.y, out, 0.25)
        disc.visible = !loaded.includes(mix.id) && !flight
        if (Math.abs(disc.position.y - out) > 0.0005) moving = true
      }
      if (Math.abs(lean - target) > 0.001 || drop > 0 || pull > 0 || (flight && t < 1)) moving = true
      sleeve.updateWorldMatrix(true, false)
      const slot = slots.current[i] ?? { centre: new Vector3(), lean }
      slot.centre.set(0, SLEEVE / 2, 0).applyMatrix4(sleeve.matrixWorld)
      slot.lean = lean
      slots.current[i] = slot
      if (i === selected) anchor.current?.set(0, SLEEVE + 0.012, 0).applyMatrix4(sleeve.matrixWorld)
    })
    BACKSTOCK.forEach((_, j) => {
      const sleeve = sleeves.current[records.length + j]
      if (!sleeve) return
      const drop = dropIn(now - born.current - delay - (records.length + j) * 0.09)
      sleeve.position.set(jitter(records.length + j), CRATE.board + drop, FRONT_Z - (records.length + j) * GAP)
      if (drop > 0) moving = true
    })
    if (moving) state.invalidate()
  })

  const { width, depth, side, board } = CRATE
  return (
    <group
      position={position}
      onPointerDown={press}
      onPointerUp={lift}
      onPointerCancel={lift}
      onLostPointerCapture={lift}
      onPointerOver={() => onHover(true)}
      onPointerOut={() => {
        onHover(false)
        setHovered(null)
      }}
      onPointerMove={(event) => {
        slide(event)
        const record = recordOf(event.object)
        if (record !== hovered) {
          setHovered(record)
          keepDrawing(500)
          invalidate()
        }
      }}
    >
      {/* The crate: a floor, two solid ends, slatted back and a low front. */}
      <mesh position={[0, board / 2, 0]} material={made.pine} castShadow receiveShadow>
        <boxGeometry args={[width, board, depth]} />
      </mesh>
      {[-1, 1].map((end) => (
        <mesh key={end} position={[end * (width / 2 - 0.007), side / 2, 0]} material={made.pineEnd} castShadow receiveShadow>
          <boxGeometry args={[0.014, side, depth]} />
        </mesh>
      ))}
      {[0.034, 0.094, 0.154].map((y) => (
        <mesh key={y} position={[0, y, -(depth / 2 - 0.007)]} material={made.pine} castShadow receiveShadow>
          <boxGeometry args={[width - 0.028, 0.05, 0.014]} />
        </mesh>
      ))}
      <mesh position={[0, (board + FRONT_WALL) / 2, depth / 2 - 0.007]} material={made.pine} castShadow receiveShadow>
        <boxGeometry args={[width - 0.028, FRONT_WALL - board, 0.014]} />
      </mesh>

      {/* The records you can dig through, then the ones filling the back. */}
      {records.map((mix, i) => (
        <group key={mix.id} ref={(node) => void (sleeves.current[i] = node)} userData={{ record: i }}>
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
        <group key={record.title} ref={(node) => void (sleeves.current[records.length + j] = node)} rotation-x={STANDING}>
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
  flight: Flight
  assets: TvAssets | null
  /** Where each record's disc sits in the crate. */
  slots: RefObject<Slot[]>
  /** Where the record lies on the deck's platter. */
  landing: Vector3
}

/**
 * A record between the crate and a deck. Going on, it comes up out of its sleeve, flies across laying itself flat
 * and turning, and comes down over the spindle onto the platter (where it waits for the deck to take it). Coming
 * off, it goes the same way back into its sleeve.
 */
export function FlyingRecord({ flight, assets, slots, landing }: FlyingRecordProps) {
  const group = useRef<Group>(null)
  const from = useRef<Slot | null>(null)
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
  const label = useMemo(() => recordLabelTexture(flight.mix, assets), [flight.mix, assets])
  useEffect(() => () => label.dispose(), [label])

  useFrame((state) => {
    const disc = group.current
    if (!disc) return
    const now = performance.now()
    if (now < flight.start) {
      disc.visible = false
      state.invalidate()
      return
    }
    // Its sleeve's place in the crate, taken as it sets off.
    const slot = slots.current[flight.slot]
    if (!from.current && slot) from.current = { centre: slot.centre.clone(), lean: slot.lean }
    const start = from.current
    if (!start) return
    const t = MathUtils.clamp((now - flight.start) / FLIGHT_MS, 0, 1)
    // Coming off, it runs the same path backwards.
    const u = flight.way === 'in' ? t : 1 - t
    const s = start.centre
    const e = landing
    const clear = s.y + 0.32
    if (u < 0.32) {
      const k = ease(u / 0.32)
      disc.position.set(s.x, MathUtils.lerp(s.y, clear, k), s.z)
      disc.rotation.set(Math.PI / 2 + start.lean * (1 - k), 0, 0)
    } else if (u < 0.8) {
      const k = ease((u - 0.32) / 0.48)
      disc.position.set(
        MathUtils.lerp(s.x, e.x, k),
        MathUtils.lerp(clear, e.y + 0.14, k) + Math.sin(k * Math.PI) * 0.06,
        MathUtils.lerp(s.z, e.z, k),
      )
      disc.rotation.set((Math.PI / 2) * (1 - k), -k * 2.4, 0)
    } else {
      const k = ease((u - 0.8) / 0.2)
      disc.position.set(e.x, MathUtils.lerp(e.y + 0.14, e.y, k), e.z)
      disc.rotation.set(0, -2.4 - k * 0.6, 0)
    }
    // Going on, it stays on the platter until the deck has it; coming off, it's gone once it's in its sleeve.
    disc.visible = flight.way === 'in' || t < 1
    if (t < 1) state.invalidate()
  })

  return (
    <group ref={group} visible={false}>
      <mesh material={vinyl} castShadow>
        <cylinderGeometry args={[0.151, 0.151, 0.0018, 96]} />
      </mesh>
      {[1, -1].map((face) => (
        <mesh key={face} position={[0, face * 0.001, 0]} rotation-x={(-face * Math.PI) / 2}>
          <circleGeometry args={[0.05, 48]} />
          <meshStandardMaterial map={label} roughness={0.7} />
        </mesh>
      ))}
    </group>
  )
}
