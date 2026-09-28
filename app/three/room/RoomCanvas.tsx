import { ContactShadows, Environment, Lightformer, PerformanceMonitor, Sparkles } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import {
  MathUtils,
  NeutralToneMapping,
  Vector3,
  type HemisphereLight,
  type PerspectiveCamera,
  type PointLight,
} from 'three'
import { CHANNELS, loadTvAssets, type TvAssets, type TvData } from '../channels'
import { CasaCam } from './CasaCam'
import { FloorLamp, HangingRecords, Plant, RecordCrate } from './Furniture'
import { Haze } from './Haze'
import { useLampLevel } from './lampLevel'
import { CENTRE_Y, FOV, FRONT_Z, layoutFor, SCREEN_SIZE, SCREEN_X, type Layout } from './layout'
import { Television } from './Television'
import { floorTexture, rugTexture, wallpaperTexture } from './textures'

/*
 * The room from the concept deck: a warm corner with an old TV as the feature, lamps whose light breathes instead
 * of flashing, a plant in subdued green, records overhead and a crate of them on the floor. Everything is built
 * from primitives and painted textures, so there are no model or image files to load. As the section scrolls in,
 * the camera walks from the doorway up to the set. The lamps switch, the volume knob turns the sound on, and a
 * security camera on the ceiling films the room for Casa Cam.
 */

type Quality = 'high' | 'low'

export interface Lamps {
  floor: boolean
  table: boolean
}

interface RoomCanvasProps {
  channel: number
  data: TvData
  /** False while the section is off screen, which stops rendering entirely. */
  active: boolean
  reducedMotion: boolean
  /** How far through the section the visitor has scrolled (0–1): drives the walk up to the set. */
  progress: RefObject<number>
  onNext: () => void
  sound: boolean
  onSound: () => void
  lamps: Lamps
  onLamp: (lamp: keyof Lamps) => void
  /** Called once the first frames have drawn, so the flat fallback TV can step aside. */
  onReady?: () => void
  /**
   * Called if the browser takes the WebGL context away (a GPU reset, memory pressure, a graphics switch), which
   * leaves the canvas blank; the page brings the flat set back and builds the room again.
   */
  onLost?: () => void
  /**
   * Called every frame with where the left edge of the picture is on screen (in canvas pixels) and how visible the
   * "tap the telly" note beside it should be, so the page can keep its note pointing at the set.
   */
  onNoteMove?: (x: number, y: number, opacity: number) => void
}

/** `?quality=high` or `?quality=low` pins the detail level, for testing on unusual hardware. */
function forcedQuality(): Quality | null {
  const value = new URLSearchParams(window.location.search).get('quality')
  return value === 'high' || value === 'low' ? value : null
}

/*
 * No post-processing (bloom, ambient occlusion, depth of field): on some Mac GPUs the scene produces a few invalid
 * pixels (NaN or infinite values), and the bloom's blur smeared them into a black box over most of the room. The
 * room renders straight to the screen instead, tone mapped by three.js, with the vignette drawn in CSS.
 */
export default function RoomCanvas(props: RoomCanvasProps) {
  const { active, reducedMotion, onReady, onLost } = props
  // More detail unless the device looks modest; the monitor steps down if frames drop below 50 a second.
  const [quality, setQuality] = useState<Quality>(
    () => forcedQuality() ?? ((navigator.hardwareConcurrency ?? 8) <= 4 ? 'low' : 'high'),
  )
  // Resolution is settled once: resizing the canvas later would blank it for a frame.
  const [dpr] = useState<number | [number, number]>(() => (quality === 'high' ? [1, 1.5] : 1))

  return (
    <Canvas
      className="room-canvas"
      shadows="percentage"
      dpr={dpr}
      camera={{ position: [0, 2.2, 14], fov: FOV, near: 0.1, far: 60 }}
      frameloop={active ? (reducedMotion ? 'demand' : 'always') : 'never'}
      gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: NeutralToneMapping }}
    >
      <PerformanceMonitor onDecline={() => setQuality(forcedQuality() ?? 'low')} />
      <FirstFrames onReady={onReady} />
      <ContextWatch onLost={onLost} />
      <Room {...props} quality={quality} />
    </Canvas>
  )
}

/** Reports ready after a few frames have actually drawn (shaders compiled), so the flat set never gives way to black. */
function FirstFrames({ onReady }: { onReady?: () => void }) {
  const frames = useRef(0)
  useFrame(() => {
    frames.current += 1
    if (frames.current === 3) onReady?.()
  })
  return null
}

/** Reports a lost WebGL context. Unmounting removes the listener first, so the room's own teardown isn't reported. */
function ContextWatch({ onLost }: { onLost?: () => void }) {
  const canvas = useThree((state) => state.gl.domElement)
  useEffect(() => {
    if (!onLost) return
    const lost = () => {
      console.warn('Casa TV lost its WebGL context; showing the flat set and rebuilding the room.')
      onLost()
    }
    canvas.addEventListener('webglcontextlost', lost)
    return () => canvas.removeEventListener('webglcontextlost', lost)
  }, [canvas, onLost])
  return null
}

/** The brand marks and fonts the screen, labels and sleeves draw with. */
function useTvAssets() {
  const [assets, setAssets] = useState<TvAssets | null>(null)
  useEffect(() => {
    let cancelled = false
    loadTvAssets().then(
      (loaded) => {
        if (!cancelled) setAssets(loaded)
      },
      (error) => console.warn('Casa TV assets unavailable.', error),
    )
    return () => {
      cancelled = true
    }
  }, [])
  return assets
}

function Room({
  channel,
  data,
  reducedMotion,
  progress,
  onNext,
  sound,
  onSound,
  lamps,
  onLamp,
  onNoteMove,
  quality,
}: RoomCanvasProps & { quality: Quality }) {
  const size = useThree((state) => state.size)
  const layout = useMemo(() => layoutFor(size.width / Math.max(size.height, 1)), [size.width, size.height])
  const assets = useTvAssets()
  const cctv = useRef<PerspectiveCamera>(null)

  return (
    <>
      <color attach="background" args={['#140b07']} />
      <fogExp2 attach="fog" args={['#170c07', 0.04]} />
      <Ambient lamps={lamps} reducedMotion={reducedMotion} />
      <Reflections />
      <CameraRig layout={layout} progress={progress} reducedMotion={reducedMotion} />

      <Walls />
      <Floor />
      <Rug />
      <WallWash lamps={lamps} reducedMotion={reducedMotion} />

      <Television
        channel={channel}
        data={data}
        assets={assets}
        reducedMotion={reducedMotion}
        onNext={onNext}
        sound={sound}
        onSound={onSound}
        lamp={lamps.table}
        onLamp={() => onLamp('table')}
        cctv={cctv}
      />
      <FloorLamp
        position={layout.lamp.position}
        scale={layout.lamp.scale}
        aim={-1}
        reducedMotion={reducedMotion}
        on={lamps.floor}
        onToggle={() => onLamp('floor')}
      />
      <Plant position={layout.plant.position} scale={layout.plant.scale} reducedMotion={reducedMotion} />
      <RecordCrate position={layout.crate.position} rotation-y={layout.crate.rotation} assets={assets} />
      <HangingRecords portrait={layout.portrait} assets={assets} reducedMotion={reducedMotion} />
      <CasaCam camera={cctv} live={CHANNELS[channel].id === 'cam'} reducedMotion={reducedMotion} />
      <Haze layout={layout} lamps={lamps} count={quality === 'high' ? 8 : 4} reducedMotion={reducedMotion} />

      {/* Dust hanging in the lamplight. */}
      <Sparkles
        count={80}
        scale={[7, 3.4, 5]}
        position={[0, 1.9, -0.3]}
        size={2}
        speed={reducedMotion ? 0 : 0.16}
        opacity={0.35}
        color="#ffcf9e"
        noise={0.7}
      />
      <ContactShadows position={[0, 0.014, 0]} opacity={0.55} scale={14} blur={2.6} far={3.5} resolution={512} frames={1} />

      {onNoteMove && <NoteAnchor layout={layout} onMove={onNoteMove} />}
    </>
  )
}

interface CameraRigProps {
  layout: Layout
  progress: RefObject<number>
  reducedMotion: boolean
}

/**
 * Walks from the wide shot to the close one as the section scrolls, easing so a flick of the wheel glides, then
 * sways a little and leans toward the pointer.
 */
function CameraRig({ layout, progress, reducedMotion }: CameraRigProps) {
  const invalidate = useThree((state) => state.invalidate)
  const motion = useRef({ t: -1, x: 0, y: 0 })
  const target = useRef(new Vector3())
  useEffect(() => invalidate(), [layout, invalidate])

  useFrame(({ camera, pointer, clock }, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1)
    const state = motion.current
    const goal = reducedMotion ? 1 : MathUtils.smootherstep(progress.current, 0.02, 0.78)
    state.t = state.t < 0 || reducedMotion ? goal : MathUtils.damp(state.t, goal, 4, delta)
    state.x = reducedMotion ? 0 : MathUtils.damp(state.x, pointer.x, 2.5, delta)
    state.y = reducedMotion ? 0 : MathUtils.damp(state.y, pointer.y, 2.5, delta)

    const { wide, close } = layout
    const t = state.t
    const sway = reducedMotion ? 0 : Math.sin(clock.elapsedTime * 0.12) * 0.1
    camera.position.set(
      MathUtils.lerp(wide.position[0], close.position[0], t) + state.x * 0.3 + sway,
      MathUtils.lerp(wide.position[1], close.position[1], t) + state.y * 0.12,
      MathUtils.lerp(wide.position[2], close.position[2], t),
    )
    target.current.set(
      MathUtils.lerp(wide.target[0], close.target[0], t),
      MathUtils.lerp(wide.target[1], close.target[1], t),
      MathUtils.lerp(wide.target[2], close.target[2], t),
    )
    camera.lookAt(target.current)
  })
  return null
}

/** How strongly the room's reflections light it with the lamps on. */
const ENVIRONMENT = 0.5

/** What the glass, brass and varnish reflect: the room's lamps and warm walls, rendered once into an env map. */
function Reflections() {
  return (
    <Environment resolution={128} frames={1} environmentIntensity={ENVIRONMENT}>
      <color attach="background" args={['#0f0805']} />
      <Lightformer form="rect" intensity={1.2} color="#ff9a55" position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
      <Lightformer form="circle" intensity={6} color="#ffb36b" position={[2.4, 2.2, -0.5]} scale={0.9} />
      <Lightformer form="circle" intensity={4} color="#ffa257" position={[-0.8, 2.6, 0.15]} scale={0.5} />
      <Lightformer form="rect" intensity={0.8} color="#ff7a33" position={[0, 2, -3]} scale={[10, 3, 1]} />
      <Lightformer form="rect" intensity={0.5} color="#ffd2a8" position={[-1, 2, 9]} scale={[6, 2.5, 1]} />
    </Environment>
  )
}

/** A corner of the room: striped wallpaper, skirting boards and a picture rail. */
function Walls() {
  const back = useMemo(() => wallpaperTexture(10.5, 4), [])
  const side = useMemo(() => wallpaperTexture(8, 4), [])
  const trim = <meshStandardMaterial color="#2a1a12" roughness={0.55} />
  return (
    <>
      <mesh position={[1.5, 3.5, -3.2]} receiveShadow>
        <planeGeometry args={[17, 7]} />
        <meshStandardMaterial map={back} roughness={0.9} />
      </mesh>
      <mesh position={[-5, 3.5, 3.3]} rotation-y={Math.PI / 2} receiveShadow>
        <planeGeometry args={[13, 7]} />
        <meshStandardMaterial map={side} roughness={0.9} />
      </mesh>
      <mesh position={[1.5, 0.09, -3.18]} receiveShadow>
        <boxGeometry args={[17, 0.18, 0.04]} />
        {trim}
      </mesh>
      <mesh position={[-4.98, 0.09, 3.3]} rotation-y={Math.PI / 2} receiveShadow>
        <boxGeometry args={[13, 0.18, 0.04]} />
        {trim}
      </mesh>
      <mesh position={[1.5, 4.3, -3.18]}>
        <boxGeometry args={[17, 0.06, 0.04]} />
        {trim}
      </mesh>
    </>
  )
}

/**
 * Varnished boards, catching the lamps in their sheen. (A blurred mirror reflection would need its own blur pass,
 * which can smear bad pixels just like bloom.)
 */
function Floor() {
  const boards = useMemo(() => floorTexture(), [])
  return (
    <mesh rotation-x={-Math.PI / 2} position={[1, 0, 2]} receiveShadow>
      <planeGeometry args={[20, 16]} />
      <meshStandardMaterial map={boards} color="#b08c76" roughness={0.6} metalness={0.1} />
    </mesh>
  )
}

function Rug() {
  const rug = useMemo(() => rugTexture(), [])
  return (
    <mesh position={[0, 0.008, 0.35]} rotation-x={-Math.PI / 2} receiveShadow>
      <circleGeometry args={[2.35, 72]} />
      <meshStandardMaterial map={rug} roughness={1} />
    </mesh>
  )
}

/**
 * The room's fill light and reflections, which are mostly the lamps bouncing off the walls: with both switched off,
 * the telly lights the room.
 */
function Ambient({ lamps, reducedMotion }: { lamps: Lamps; reducedMotion: boolean }) {
  const fill = useRef<HemisphereLight>(null)
  const table = useLampLevel(lamps.table, reducedMotion)
  const floor = useLampLevel(lamps.floor, reducedMotion)
  useFrame(({ clock, scene }, delta) => {
    const lit = (table(clock.elapsedTime, delta).power + floor(clock.elapsedTime, delta).power) / 2
    if (fill.current) fill.current.intensity = 0.12 + 0.23 * lit
    scene.environmentIntensity = ENVIRONMENT * (0.3 + 0.7 * lit)
  })
  return <hemisphereLight ref={fill} args={['#ffb27a', '#1a0c06', 0.35]} />
}

/**
 * Warm light pooling on the wall behind the set and in the corner, breathing out of step with the lamps. Most of
 * it is the lamps' spill, so it sinks when they're switched off.
 */
function WallWash({ lamps, reducedMotion }: { lamps: Lamps; reducedMotion: boolean }) {
  const behind = useRef<PointLight>(null)
  const corner = useRef<PointLight>(null)
  const table = useLampLevel(lamps.table, reducedMotion, 1.7)
  const floor = useLampLevel(lamps.floor, reducedMotion, 4.1)
  useFrame(({ clock }, delta) => {
    const back = table(clock.elapsedTime, delta)
    const side = floor(clock.elapsedTime, delta)
    if (behind.current) behind.current.intensity = 9 * back.level * (0.15 + 0.85 * back.power)
    if (corner.current) corner.current.intensity = 6 * side.level * (0.15 + 0.85 * side.power)
  })
  return (
    <>
      <pointLight ref={behind} position={[0, 2.3, -2.7]} color="#ff7a33" intensity={9} distance={6} decay={1.4} />
      <pointLight ref={corner} position={[-4.3, 2.4, -2.6]} color="#ff8a4a" intensity={6} distance={5} decay={1.5} />
    </>
  )
}

/**
 * Projects the left edge of the picture to the screen for the page's "tap the telly" note, fading it in as the
 * camera arrives at the close shot. Tall screens keep the note under the section title instead.
 */
function NoteAnchor({ layout, onMove }: { layout: Layout; onMove: (x: number, y: number, opacity: number) => void }) {
  const point = useRef(new Vector3())
  useFrame(({ camera, size }) => {
    const anchor = point.current
    anchor.set(SCREEN_X - SCREEN_SIZE.width / 2 - 0.14, CENTRE_Y + 0.14, FRONT_Z + 0.05).project(camera)
    const near = layout.close.position[2]
    const far = layout.wide.position[2]
    const arrived = 1 - (camera.position.z - near) / (far - near)
    onMove(
      (anchor.x * 0.5 + 0.5) * size.width,
      (0.5 - anchor.y * 0.5) * size.height,
      layout.portrait ? 0 : MathUtils.smoothstep(arrived, 0.75, 0.98),
    )
  })
  return null
}
