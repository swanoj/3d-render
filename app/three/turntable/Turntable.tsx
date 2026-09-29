import { Environment, Lightformer, RoundedBox } from '@react-three/drei'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AdditiveBlending,
  CatmullRomCurve3,
  MathUtils,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  TubeGeometry,
  Vector3,
  type Group,
} from 'three'
import { palette } from '../../brand/brand'
import {
  BRAKE,
  casaSound,
  GROOVE_BPM,
  NEEDLE_DROP,
  PITCH_RANGE,
  SPIN_UP,
  type Arm,
  type DeckIndex,
  type DeckState,
} from '../../lib/casaSound'
import { loadTvAssets, type TvAssets } from '../channels'
import { glowTexture } from '../room/textures'
import {
  ARM_HEIGHT,
  ARM_LENGTH,
  armPose,
  grabLift,
  grooveAt,
  HEADSHELL_OFFSET,
  LIFT_ANGLE,
  lowerPose,
  pageTime,
  PIVOT,
  RECORD_RADIUS,
  RECORD_TOP,
  REST,
  SWING_MAX,
  SWING_MIN,
  trackSwing,
  type Pose,
} from './arm'
import { grab, pointerOn, release } from './drag'
import { pageShadowTexture, paintTempo, plinthPrintTexture, recordLabelTexture, strobeTexture, tempoTexture, vinylMaps } from './textures'

/** 33⅓ revolutions a minute, in radians a second. */
const SPEED = ((100 / 3) * Math.PI * 2) / 60
const PLINTH = { width: 0.453, depth: 0.353, centreX: 0.0365, centreZ: 0.0065 }
const PLATTER = 0.166
/** The pitch fader: the middle of its slot, and how far the knob travels either way (to ±8%). */
const PITCH = { x: 0.225, z: 0.07, travel: 0.055 }
const START = { x: -0.155, z: 0.158 }
const SPEEDS = [
  { rpm: 33, x: -0.104 },
  { rpm: 45, x: -0.081 },
] as const

/** An angle wrapped into -π…π, for following a pointer round and round. */
const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle))

/**
 * A soft studio for the metal and the vinyl to reflect: a warm overhead softbox, a fill from the left, a bright
 * strip behind for the record's streak and a little Casa orange from the front. Rendered once into an environment
 * map, with a key light for the arm's shadow on the record. No post-processing.
 */
export function Studio() {
  return (
    <>
      <Environment resolution={256} frames={1}>
        {/* A warm grey studio, so brushed metal reads as silver rather than mirroring black. */}
        <color attach="background" args={['#5a544e']} />
        <Lightformer form="rect" intensity={2.2} color="#fff3e4" position={[0, 1.4, 0.3]} scale={[1.4, 0.8, 1]} />
        <Lightformer form="rect" intensity={1.8} color="#fff6ec" position={[0, 0.9, -1.4]} scale={[2.6, 1.1, 1]} />
        <Lightformer form="rect" intensity={1.1} color="#ffe0c0" position={[-1.2, 0.6, 0.5]} scale={[0.8, 0.8, 1]} />
        <Lightformer form="rect" intensity={6} color="#ffffff" position={[-0.2, 0.5, -1]} scale={[0.12, 1.8, 1]} />
        <Lightformer form="rect" intensity={0.8} color={palette.orange} position={[0, 0.25, 1.3]} scale={[2, 0.4, 1]} />
      </Environment>
      <hemisphereLight args={['#fff1e0', '#3a2a20', 0.5]} />
      <directionalLight
        position={[-0.3, 0.9, 0.35]}
        intensity={1.8}
        color="#fff4e8"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-0.36}
        shadow-camera-right={0.36}
        shadow-camera-top={0.36}
        shadow-camera-bottom={-0.36}
        shadow-camera-near={0.3}
        shadow-camera-far={1.6}
        shadow-bias={-0.0004}
        shadow-normalBias={0.004}
      />
    </>
  )
}

/** The arm tube: straight back to the counterweight, and an S-bend forward to the headshell's collar. */
function armTube() {
  const back = Math.sin(HEADSHELL_OFFSET) * -0.052
  const collar = ARM_LENGTH + Math.cos(HEADSHELL_OFFSET) * -0.052
  const curve = new CatmullRomCurve3([
    new Vector3(0, 0, -0.078),
    new Vector3(0, 0, 0),
    new Vector3(0.012, 0, 0.055),
    new Vector3(0.028, 0, 0.11),
    new Vector3(0.031, 0, 0.145),
    new Vector3(back, 0, collar),
  ])
  return new TubeGeometry(curve, 120, 0.0042, 16, false)
}

function materials() {
  return {
    chrome: new MeshPhysicalMaterial({ color: '#dcdcdc', metalness: 1, roughness: 0.1 }),
    brushed: new MeshPhysicalMaterial({ color: '#c6c5c1', metalness: 1, roughness: 0.34, anisotropy: 0.7 }),
    body: new MeshStandardMaterial({ color: '#232326', metalness: 0.35, roughness: 0.5 }),
    rubber: new MeshStandardMaterial({ color: '#141415', roughness: 0.95 }),
    blackMetal: new MeshPhysicalMaterial({ color: '#1b1b1e', metalness: 0.7, roughness: 0.32 }),
    cartridge: new MeshPhysicalMaterial({ color: palette.orange, roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.2 }),
    edge: new MeshStandardMaterial({ color: '#0e0e0f', roughness: 0.3 }),
    lit: new MeshBasicMaterial({ color: '#ff8a4c', toneMapped: false }),
  }
}

interface Motion {
  /** The platter's angle and speed (radians, radians a second). */
  angle: number
  speed: number
  /** The record's, which slips on the mat under the DJ's hand. */
  record: number
  recordSpeed: number
  pose: Pose
  from: Pose
  /** The arm's state the current move heads for, and when that move began. */
  arm: Arm
  since: number
  /** Where the DJ's holding the arm, and where the pointer last was on the plinth. */
  held: number
  grip: { x: number; z: number }
  /** The DJ's hand on the record: where they've turned it to, the pointer's last bearing from the spindle. */
  hand: { target: number; bearing: number; moved: number; at: number } | null
  /** Just let go of the record: the music follows it back up to speed. */
  letGo: boolean
  /** The start/stop button going down (1) and back up (0). */
  pressed: number
}

type Dragged = 'arm' | 'record' | 'pitch'
type Part = Dragged | 'button' | 'deck'

interface TurntableProps {
  deck: DeckState
  /** Which deck it is, for its speed, its needle and its controls. */
  index: DeckIndex
  /** A soft shadow drawn under it, for sitting on the page; off when it stands on something that takes shadows. */
  pageShadow?: boolean
  /**
   * On the DJ desk it can be played: the arm lifts off and drops where it's put, the record scratches under the
   * pointer, and the start/stop, 33/45 and pitch fader work. A tap elsewhere on it calls `onTap`.
   */
  playable?: boolean
  onTap?: () => void
}

/**
 * A club turntable. On play the platter spins up and the arm lifts, swings over the record and lowers, the needle
 * landing as the music starts; it then creeps inwards as the record plays. On pause the arm lifts and goes back
 * to its rest, and the platter brakes. Frames are drawn only while something moves.
 */
export function Turntable({ deck, index, pageShadow = true, playable = false, onTap }: TurntableProps) {
  const invalidate = useThree((state) => state.invalidate)
  const root = useRef<Group>(null)
  const platter = useRef<Group>(null)
  const vinylSide = useRef<Group>(null)
  const swing = useRef<Group>(null)
  const pitch = useRef<Group>(null)
  const lever = useRef<Group>(null)
  const slider = useRef<Group>(null)
  const button = useRef<Group>(null)
  const zero = useRef<MeshBasicMaterial>(null)
  const motion = useRef<Motion>({
    angle: 0,
    speed: 0,
    record: 0,
    recordSpeed: 0,
    pose: { swing: REST, lift: 0 },
    from: { swing: REST, lift: 0 },
    arm: deck.arm,
    since: deck.since,
    held: REST,
    grip: { x: 0, z: 0 },
    hand: null,
    letGo: false,
    pressed: 0,
  })
  const drag = useRef<{ part: Dragged; pointer: number } | null>(null)
  const [assets, setAssets] = useState<TvAssets | null>(null)
  const [hover, setHover] = useState<Part | null>(null)
  const [grabbing, setGrabbing] = useState(false)

  useEffect(() => {
    let live = true
    loadTvAssets().then((loaded) => {
      if (live) setAssets(loaded)
    })
    return () => {
      live = false
    }
  }, [])

  // The pointer shows what a part does: a hand for what's dragged, a finger for what's pressed.
  const cursor = grabbing ? 'grabbing' : hover === 'arm' || hover === 'record' || hover === 'pitch' ? 'grab' : hover ? 'pointer' : null
  useEffect(() => {
    if (!cursor) return
    document.body.style.cursor = cursor
    return () => {
      document.body.style.cursor = 'auto'
    }
  }, [cursor])

  const made = useMemo(() => materials(), [])
  const tube = useMemo(() => armTube(), [])
  const vinyl = useMemo(() => {
    const maps = vinylMaps()
    return new MeshPhysicalMaterial({
      color: '#0b0b0c',
      roughness: 1,
      roughnessMap: maps.roughness,
      anisotropy: 0.9,
      anisotropyMap: maps.anisotropy,
      clearcoat: 0.3,
      clearcoatRoughness: 0.22,
    })
  }, [])
  const strobe = useMemo(() => new MeshPhysicalMaterial({ map: strobeTexture(), metalness: 1, roughness: 0.3 }), [])
  const shadow = useMemo(() => pageShadowTexture(), [])
  const halo = useMemo(() => glowTexture(), [])
  const print = useMemo(() => {
    const { width, depth, centreX, centreZ } = PLINTH
    const plate = { left: centreX - width / 2, back: centreZ - depth / 2, width, depth }
    return plinthPrintTexture(playable ? index + 1 : null, plate)
  }, [playable, index])
  const label = useMemo(() => (deck.record ? recordLabelTexture(deck.record, assets) : null), [deck.record, assets])
  const tempo = useMemo(() => (playable ? tempoTexture() : null), [playable])
  const shownTempo = useRef('')

  useEffect(() => () => label?.dispose(), [label])
  useEffect(() => () => print.dispose(), [print])
  useEffect(() => () => tempo?.dispose(), [tempo])
  useEffect(() => {
    invalidate()
  }, [deck, label, invalidate])

  // The parts the DJ plays by dragging: where the pointer is on them, and what it does as it moves.
  const hit = useMemo(() => new Vector3(), [])
  const pointer = (event: ThreeEvent<PointerEvent>, height: number) =>
    root.current ? pointerOn(event, root.current, height, hit) : null

  const slidePitch = (event: ThreeEvent<PointerEvent>) => {
    const point = pointer(event, 0.004)
    if (!point) return
    const value = (point.z - PITCH.z) / PITCH.travel
    // A detent in the middle, as on the real fader.
    casaSound.setPitch(index, Math.abs(value) < 0.07 ? 0 : value)
  }

  /** The DJ takes hold of a part; false if the pointer isn't really on it. */
  const take = (part: Dragged, event: ThreeEvent<PointerEvent>) => {
    const m = motion.current
    if (part === 'pitch') {
      slidePitch(event)
      return true
    }
    const point = pointer(event, part === 'arm' ? ARM_HEIGHT : RECORD_TOP)
    if (!point) return false
    if (part === 'arm') {
      m.held = m.pose.swing
      m.grip = { x: point.x, z: point.z }
      casaSound.holdArm(index)
    } else {
      m.hand = { target: m.record, bearing: Math.atan2(point.x, point.z), moved: 0, at: event.timeStamp }
    }
    return true
  }

  const move = (part: Dragged, event: ThreeEvent<PointerEvent>) => {
    const m = motion.current
    if (part === 'pitch') return slidePitch(event)
    const point = pointer(event, part === 'arm' ? ARM_HEIGHT : RECORD_TOP)
    if (!point) return
    if (part === 'arm') {
      // As if the DJ's fingers were on the headshell wherever they took hold: the pointer's move along its arc.
      const dx = point.x - m.grip.x
      const dz = point.z - m.grip.z
      m.grip = { x: point.x, z: point.z }
      const along = dx * Math.cos(m.held) - dz * Math.sin(m.held)
      m.held = MathUtils.clamp(m.held + along / ARM_LENGTH, SWING_MIN, SWING_MAX)
    } else if (m.hand) {
      const bearing = Math.atan2(point.x, point.z)
      const change = wrap(bearing - m.hand.bearing)
      m.hand.bearing = bearing
      // The record plays clockwise, which takes the bearing down.
      m.hand.target -= change
      m.hand.moved += Math.abs(change)
    }
  }

  const letGo = (part: Dragged, event: ThreeEvent<PointerEvent>) => {
    const m = motion.current
    if (part === 'arm') {
      // Over the grooves the needle goes down there; anywhere else the arm goes home.
      const progress = grooveAt(m.held)
      if (progress === null) casaSound.pause(index)
      else casaSound.dropArm(index, progress)
    } else if (part === 'record') {
      const hand = m.hand
      m.hand = null
      m.letGo = true
      // A tap, rather than a spin, plays or stops the deck.
      if (hand && hand.moved < 0.05 && event.timeStamp - hand.at < 350) onTap?.()
    }
  }

  const dragAs = (part: Dragged) => {
    const end = (event: ThreeEvent<PointerEvent>) => {
      if (drag.current?.part !== part || drag.current.pointer !== event.pointerId) return
      drag.current = null
      release(event)
      setGrabbing(false)
      letGo(part, event)
      invalidate()
    }
    return {
      onPointerDown(event: ThreeEvent<PointerEvent>) {
        if (event.button > 0 || drag.current || !take(part, event)) return
        grab(event)
        drag.current = { part, pointer: event.pointerId }
        setGrabbing(true)
        invalidate()
      },
      onPointerMove(event: ThreeEvent<PointerEvent>) {
        if (drag.current?.part !== part || drag.current.pointer !== event.pointerId) return
        event.stopPropagation()
        move(part, event)
        invalidate()
      },
      onPointerUp: end,
      onPointerCancel: end,
      onLostPointerCapture: end,
      // Its own press isn't a tap on the deck.
      onClick(event: ThreeEvent<MouseEvent>) {
        event.stopPropagation()
      },
    }
  }

  const hoverAs = (part: Part) => ({
    onPointerOver(event: ThreeEvent<PointerEvent>) {
      event.stopPropagation()
      setHover(part)
    },
    onPointerOut() {
      setHover((current) => (current === part ? null : current))
    },
  })
  const press = (action: () => void) => (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    motion.current.pressed = 1
    action()
    invalidate()
  }

  useFrame((state, delta) => {
    const m = motion.current
    const dt = Math.min(delta, 0.05)
    const now = pageTime()
    // A new move starts from wherever the arm is now.
    if (m.arm !== deck.arm) {
      m.from = { ...m.pose }
      m.arm = deck.arm
      m.since = deck.since
    }
    const elapsed = (now - m.since) / 1000
    const arm = deck.arm
    if (arm.at === 'held') m.pose = { swing: m.held, lift: grabLift(elapsed, m.from) }
    else if (arm.at === 'record') {
      const to = trackSwing(casaSound.deckProgress(index))
      m.pose = arm.move === 'lower' ? lowerPose(elapsed, m.from, to) : armPose(elapsed, m.from, to)
    } else m.pose = armPose(elapsed, m.from, REST)

    // The platter comes up to speed like the motor, and brakes to a stop.
    const nominal = SPEED * casaSound.speed(index)
    const target = deck.motor ? nominal : 0
    const step = (deck.motor ? SPEED / SPIN_UP : SPEED / BRAKE) * dt
    m.speed = m.speed < target ? Math.min(target, m.speed + step) : Math.max(target, m.speed - step)
    m.angle = (m.angle + m.speed * dt) % (Math.PI * 2)

    // The record turns with the platter, unless the DJ's hand is on it; let go, and the mat takes it back up to speed.
    if (m.hand) {
      const before = m.record
      m.record += (m.hand.target - m.record) * Math.min(1, dt * 40)
      m.recordSpeed = (m.record - before) / Math.max(dt, 1e-3)
      casaSound.scratch(index, m.recordSpeed / nominal)
    } else {
      m.recordSpeed = MathUtils.damp(m.recordSpeed, m.speed, 16, dt)
      m.record += m.recordSpeed * dt
      if (m.letGo) {
        const caughtUp = Math.abs(m.recordSpeed - m.speed) < 0.02
        casaSound.scratch(index, caughtUp ? null : m.recordSpeed / nominal)
        if (caughtUp) m.letGo = false
      }
    }
    m.pressed = Math.max(0, m.pressed - dt * 7)
    const pitchNow = casaSound.controls().pitch[index]

    if (platter.current) platter.current.rotation.y = -m.angle
    if (vinylSide.current) vinylSide.current.rotation.y = -m.record
    if (swing.current) swing.current.rotation.y = m.pose.swing
    if (pitch.current) pitch.current.rotation.x = -m.pose.lift * LIFT_ANGLE
    if (lever.current) lever.current.rotation.x = -0.45 * m.pose.lift
    if (slider.current) slider.current.position.z = PITCH.z + pitchNow * PITCH.travel
    if (button.current) button.current.position.y = -0.0016 * Math.sin(m.pressed * Math.PI)
    if (zero.current) zero.current.color.set(pitchNow === 0 ? '#63ff86' : '#123019')
    if (tempo) {
      const bpm = GROOVE_BPM * casaSound.speed(index)
      const percent = pitchNow * PITCH_RANGE * 100
      const shown = `${bpm.toFixed(1)} ${percent.toFixed(1)} ${deck.motor}`
      if (shown !== shownTempo.current) {
        shownTempo.current = shown
        paintTempo(tempo, bpm, percent, deck.motor)
      }
    }

    const moving = arm.at === 'held' || elapsed < NEEDLE_DROP + 0.1 || m.hand || m.letGo || m.pressed > 0
    const settled = !moving && !deck.motor && m.speed === 0 && Math.abs(m.recordSpeed) < 0.001
    if (!settled) state.invalidate()
  })

  const { width, depth, centreX, centreZ } = PLINTH
  return (
    <group
      ref={root}
      {...(playable && {
        onClick(event: ThreeEvent<MouseEvent>) {
          event.stopPropagation()
          if (event.delta < 6) onTap?.()
        },
        // Anywhere on it that isn't a control is a tap to play or stop.
        onPointerMove() {
          if (hover === null && onTap) setHover('deck')
        },
        onPointerOut() {
          setHover(null)
        },
      })}
    >
      {/* Its shadow on the page. */}
      {pageShadow && (
        <mesh position={[centreX, -0.0965, centreZ + 0.012]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[width * 1.45, depth * 1.6]} />
          <meshBasicMaterial map={shadow} transparent opacity={0.6} depthWrite={false} />
        </mesh>
      )}

      {/* Plinth: a dark body under a brushed aluminium top plate, on four rubber feet, with its printing on top. */}
      <RoundedBox
        args={[width, 0.07, depth]}
        radius={0.008}
        smoothness={4}
        position={[centreX, -0.041, centreZ]}
        material={made.body}
        castShadow
      />
      <RoundedBox
        args={[width - 0.002, 0.008, depth - 0.002]}
        radius={0.003}
        smoothness={3}
        position={[centreX, -0.004, centreZ]}
        material={made.brushed}
        receiveShadow
      />
      <mesh position={[centreX, 0.0003, centreZ]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[width, depth]} />
        <meshBasicMaterial map={print} transparent depthWrite={false} />
      </mesh>
      {[
        [-0.14, -0.12],
        [0.213, -0.12],
        [-0.14, 0.133],
        [0.213, 0.133],
      ].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, -0.086, z]} material={made.rubber} castShadow>
          <cylinderGeometry args={[0.032, 0.035, 0.02, 32]} />
        </mesh>
      ))}

      {/* Start/stop. */}
      <group position={[START.x, 0.002, START.z]}>
        <group ref={button}>
          <mesh material={made.chrome} castShadow>
            <boxGeometry args={[0.046, 0.005, 0.03]} />
          </mesh>
        </group>
        {playable && (
          <mesh visible={false} onClick={press(() => casaSound.toggleMotor(index))} {...hoverAs('button')}>
            <boxGeometry args={[0.062, 0.014, 0.044]} />
          </mesh>
        )}
      </group>
      {/* 33 and 45, the one in use lit. */}
      {SPEEDS.map(({ rpm, x }) => (
        <group key={rpm} position={[x, 0.0015, 0.163]}>
          <mesh material={made.blackMetal}>
            <boxGeometry args={[0.018, 0.004, 0.012]} />
          </mesh>
          <mesh position={[0, 0.0021, 0]} material={deck.rpm === rpm ? made.lit : made.blackMetal}>
            <boxGeometry args={[0.012, 0.0004, 0.002]} />
          </mesh>
          {playable && (
            <mesh visible={false} onClick={press(() => casaSound.setRpm(index, rpm))} {...hoverAs('button')}>
              <boxGeometry args={[0.022, 0.014, 0.03]} />
            </mesh>
          )}
        </group>
      ))}
      {/* The pitch fader, and the green light that shows it's dead centre. */}
      <mesh position={[PITCH.x, 0.0004, PITCH.z]} material={made.rubber}>
        <boxGeometry args={[0.012, 0.0012, 0.13]} />
      </mesh>
      <group ref={slider} position={[PITCH.x, 0.004, PITCH.z]}>
        <mesh material={made.blackMetal} castShadow>
          <boxGeometry args={[0.03, 0.008, 0.014]} />
        </mesh>
        <mesh position={[0, 0.0041, 0]} material={made.chrome}>
          <boxGeometry args={[0.028, 0.0004, 0.0016]} />
        </mesh>
      </group>
      <mesh position={[PITCH.x + 0.021, 0.0012, PITCH.z]}>
        <cylinderGeometry args={[0.0022, 0.0022, 0.002, 16]} />
        <meshBasicMaterial ref={zero} color="#63ff86" toneMapped={false} />
      </mesh>
      {/* The tempo display: the record's BPM and the pitch fader's percentage. */}
      {tempo && (
        <mesh position={[0.155, 0.0006, 0.163]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[0.072, 0.0225]} />
          <meshBasicMaterial map={tempo} toneMapped={false} />
        </mesh>
      )}
      {playable && (
        <mesh visible={false} position={[PITCH.x, 0.006, PITCH.z]} {...dragAs('pitch')} {...hoverAs('pitch')}>
          <boxGeometry args={[0.046, 0.014, 0.15]} />
        </mesh>
      )}

      {/* The strobe light by the platter's edge, glowing Casa orange on the dots. */}
      <mesh position={[-0.148, 0.004, 0.11]} rotation-y={0.8}>
        <boxGeometry args={[0.022, 0.008, 0.012]} />
        <meshStandardMaterial color="#ff7a3a" emissive="#ff5a1c" emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
      <sprite position={[-0.148, 0.01, 0.11]} scale={0.07} raycast={() => null}>
        <spriteMaterial map={halo} color="#ff6a2a" transparent opacity={0.55} blending={AdditiveBlending} depthWrite={false} />
      </sprite>
      <pointLight position={[-0.14, 0.012, 0.1]} color="#ff6a2a" intensity={0.08} distance={0.14} decay={2} />

      {/* The platter and its mat; the record sits on top and turns with them, or slips under the DJ's hand. */}
      <group ref={platter}>
        <mesh position={[0, 0.01, 0]} material={strobe}>
          <cylinderGeometry args={[PLATTER, PLATTER, 0.012, 128, 1, true]} />
        </mesh>
        <mesh position={[0, 0.016, 0]} rotation-x={-Math.PI / 2} material={made.rubber} receiveShadow>
          <circleGeometry args={[PLATTER, 96]} />
        </mesh>
      </group>
      <group ref={vinylSide} visible={Boolean(deck.record)} {...(playable && deck.record ? { ...dragAs('record'), ...hoverAs('record') } : {})}>
        <mesh position={[0, RECORD_TOP - 0.0009, 0]} material={made.edge}>
          <cylinderGeometry args={[RECORD_RADIUS, RECORD_RADIUS, 0.0018, 128, 1, true]} />
        </mesh>
        <mesh position={[0, RECORD_TOP, 0]} rotation-x={-Math.PI / 2} material={vinyl} receiveShadow>
          <circleGeometry args={[RECORD_RADIUS, 160]} />
        </mesh>
        {label && (
          <mesh position={[0, RECORD_TOP + 0.0002, 0]} rotation-x={-Math.PI / 2} receiveShadow>
            <circleGeometry args={[0.05, 64]} />
            <meshStandardMaterial map={label} roughness={0.7} />
          </mesh>
        )}
      </group>
      <mesh position={[0, 0.023, 0]} material={made.chrome} castShadow>
        <cylinderGeometry args={[0.0036, 0.0036, 0.014, 24]} />
      </mesh>
      <mesh position={[0, 0.03, 0]} material={made.chrome}>
        <sphereGeometry args={[0.0036, 16, 12]} />
      </mesh>

      {/* The arm's base: the collar, the height ring and the gimbal's post, with the cue lever beside them. */}
      <group position={[PIVOT.x, 0, PIVOT.z]}>
        <mesh position={[0, 0.003, 0]} material={made.brushed} castShadow receiveShadow>
          <cylinderGeometry args={[0.034, 0.036, 0.006, 48]} />
        </mesh>
        <mesh position={[0, 0.012, 0]} material={made.blackMetal} castShadow>
          <cylinderGeometry args={[0.026, 0.026, 0.012, 48]} />
        </mesh>
        <mesh position={[0, 0.024, 0]} material={made.chrome} castShadow>
          <cylinderGeometry args={[0.012, 0.015, 0.016, 32]} />
        </mesh>
        <mesh position={[0.036, 0.006, -0.03]} material={made.blackMetal} castShadow>
          <cylinderGeometry args={[0.01, 0.01, 0.012, 32]} />
        </mesh>
        <group ref={lever} position={[-0.044, 0.006, 0.026]}>
          <mesh position={[0, 0, 0]} material={made.chrome}>
            <cylinderGeometry args={[0.004, 0.005, 0.012, 16]} />
          </mesh>
          <mesh position={[0, 0.006, 0.014]} rotation-x={-0.2} material={made.chrome} castShadow>
            <boxGeometry args={[0.004, 0.003, 0.028]} />
          </mesh>
          <mesh position={[0, 0.009, 0.028]} material={made.blackMetal}>
            <sphereGeometry args={[0.0045, 16, 12]} />
          </mesh>
        </group>
      </group>

      {/* The arm rest, where the arm sits when it's not playing. */}
      <group position={[PIVOT.x + 0.03, 0, PIVOT.z + 0.15]}>
        <mesh position={[0, 0.015, 0]} material={made.blackMetal} castShadow>
          <cylinderGeometry args={[0.0035, 0.0045, 0.03, 16]} />
        </mesh>
        <mesh position={[0, 0.031, 0]} rotation-z={Math.PI} material={made.blackMetal}>
          <torusGeometry args={[0.0055, 0.0014, 8, 16, Math.PI]} />
        </mesh>
      </group>

      {/* The arm: swings about the vertical at the pivot, and pitches up on the cue. */}
      <group ref={swing} position={[PIVOT.x, ARM_HEIGHT, PIVOT.z]}>
        <group ref={pitch}>
          <mesh material={made.chrome} castShadow>
            <cylinderGeometry args={[0.011, 0.011, 0.02, 32]} />
          </mesh>
          <mesh geometry={tube} material={made.chrome} castShadow />
          {/* The counterweight, with its silver rings. */}
          <mesh position={[0, 0, -0.064]} rotation-x={Math.PI / 2} material={made.blackMetal} castShadow>
            <cylinderGeometry args={[0.017, 0.017, 0.03, 48]} />
          </mesh>
          {[-0.0795, -0.0485].map((z) => (
            <mesh key={z} position={[0, 0, z]} rotation-x={Math.PI / 2} material={made.chrome}>
              <cylinderGeometry args={[0.0172, 0.0172, 0.002, 48]} />
            </mesh>
          ))}
          {/* Headshell, finger lift, cartridge and stylus. The stylus tip sits exactly ARM_LENGTH from the pivot. */}
          <group position={[0, 0, ARM_LENGTH]} rotation-y={HEADSHELL_OFFSET}>
            <mesh position={[0, 0, -0.056]} rotation-x={Math.PI / 2} material={made.chrome} castShadow>
              <cylinderGeometry args={[0.0056, 0.0056, 0.012, 24]} />
            </mesh>
            <mesh position={[0, -0.0005, -0.022]} material={made.brushed} castShadow>
              <boxGeometry args={[0.019, 0.0035, 0.054]} />
            </mesh>
            <mesh position={[0.016, 0.001, 0.0]} rotation-y={0.55} rotation-z={-0.25} material={made.brushed} castShadow>
              <boxGeometry args={[0.022, 0.0022, 0.004]} />
            </mesh>
            <mesh position={[0, -0.0092, -0.012]} material={made.cartridge} castShadow>
              <boxGeometry args={[0.016, 0.0135, 0.026]} />
            </mesh>
            <mesh position={[0, RECORD_TOP - ARM_HEIGHT + 0.002, 0]} rotation-x={Math.PI} material={made.chrome}>
              <coneGeometry args={[0.0009, 0.004, 12]} />
            </mesh>
          </group>
          {/* Somewhere generous to take hold of it, from the counterweight to the headshell. */}
          {playable && (
            <mesh visible={false} position={[0.012, 0.004, 0.075]} {...dragAs('arm')} {...hoverAs('arm')}>
              <boxGeometry args={[0.052, 0.032, 0.33]} />
            </mesh>
          )}
        </group>
      </group>
    </group>
  )
}
