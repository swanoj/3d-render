import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { MathUtils, NeutralToneMapping, Vector3, type PerspectiveCamera } from 'three'
import { mixes } from '../../content/radio'
import type { DeckIndex, DeckState } from '../../lib/casaSound'
import { loadTvAssets, type TvAssets } from '../channels'
import { RECORD_TOP } from '../turntable/arm'
import { dragging } from '../turntable/drag'
import { Turntable } from '../turntable/Turntable'
import { BackWall, BoothLights, DeskTop } from './Booth'
import { Crate, FlyingRecord, type Slot } from './Crate'
import { Headphones } from './Headphones'
import { deskActivity, deskLayout, keepDrawing, seconds, type DeskLayout, type Flight } from './layout'
import { Mixer } from './Mixer'

/** How far the camera has craned over the desk, 0 (low, the neon behind the decks) to 1 (looking down on them). */
export interface DeskScroll {
  over: number
}

/** Where deck 1 is on screen (px, in the canvas), for the note pointing at it, and how many decks there are. */
export interface DeskAnchors {
  deck: [number, number]
  decks: 1 | 2
}

interface DeskCanvasProps {
  desk: readonly [DeckState, DeckState]
  selected: number
  flights: Flight[]
  /** Draw frames at all: off while the booth is off screen. */
  active: boolean
  scroll: RefObject<DeskScroll>
  /** A tap on a deck (not on its controls), or on the headphones: play or stop. */
  onTap: (deck: DeckIndex) => void
  onToggle: () => void
  onFlip: (step: number) => void
  onPlay: (index: number) => void
  onAnchors: (anchors: DeskAnchors) => void
  onReady: () => void
}

/** The turntables' feet stand on the desk; their spindles sit this high above it. */
const DECK_Y = 0.096
/** Pixels of scrolling over the crate to flick one record, and the least time between flicks. */
const WHEEL_FLICK = 90
const WHEEL_GAP = 70
const ease = (t: number) => 1 - (1 - t) ** 3

/**
 * The booth at the foot of the landing page: two decks and a mixer, headphones and a crate of records to dig
 * through, on a walnut desk under a neon sign. It's all playable. Rendered straight to the screen like the other 3D
 * (no post-processing), and only while something moves.
 */
export default function DeskCanvas({ active, onReady, ...props }: DeskCanvasProps) {
  return (
    <Canvas
      className="dj-desk-canvas"
      frameloop={active ? 'demand' : 'never'}
      shadows="percentage"
      dpr={[1, 1.5]}
      camera={{ fov: 30, near: 0.05, far: 12, position: [0, 0.5, 2.5] }}
      gl={{ antialias: true, toneMapping: NeutralToneMapping }}
      onCreated={({ gl }) => {
        gl.setClearColor('#140f0c')
        requestAnimationFrame(onReady)
      }}
    >
      <Scene {...props} />
    </Canvas>
  )
}

function Scene({ desk, selected, flights, scroll, onTap, onToggle, onFlip, onPlay, onAnchors }: Omit<DeskCanvasProps, 'active' | 'onReady'>) {
  const size = useThree((state) => state.size)
  const invalidate = useThree((state) => state.invalidate)
  const layout = deskLayout(size.width / Math.max(1, size.height))
  const [assets, setAssets] = useState<TvAssets | null>(null)
  const slots = useRef<Slot[]>([])
  const overCrate = useRef(false)
  const landings = useMemo(
    () =>
      [layout.deckA, layout.deckB ?? layout.deckA].map((x) => new Vector3(x, DECK_Y + RECORD_TOP + 0.001, layout.deckZ)),
    [layout.deckA, layout.deckB, layout.deckZ],
  )

  useEffect(() => {
    let live = true
    loadTvAssets().then((loaded) => {
      if (live) setAssets(loaded)
    })
    return () => {
      live = false
    }
  }, [])

  // The camera follows the page as it scrolls.
  useEffect(() => {
    const onScroll = () => {
      keepDrawing(900)
      invalidate()
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [invalidate])

  const loaded = desk.flatMap((deck) => (deck.record ? [deck.record.id] : []))
  const centre = (layout.span[0] + layout.span[1]) / 2
  const decks = [layout.deckA, layout.deckB] as const
  return (
    <>
      <BoothLights />
      <BackWall centre={centre} sign={layout.sign} assets={assets} />
      <DeskTop centre={centre} />
      <Rig layout={layout} scroll={scroll} />
      <Driver />
      <Gestures overCrate={overCrate} onFlip={onFlip} />
      <Anchors layout={layout} onAnchors={onAnchors} />

      {layout.headphones && (
        <Headphones
          position={[layout.headphones.x, 0, layout.headphones.z]}
          turn={layout.headphones.turn}
          assets={assets}
          delay={0.5}
          onToggle={onToggle}
        />
      )}
      {decks.map(
        (x, i) =>
          x !== null && (
            <group key={i} position={[x, DECK_Y, layout.deckZ]}>
              <Turntable deck={desk[i]} index={i as DeckIndex} pageShadow={false} playable onTap={() => onTap(i as DeckIndex)} />
            </group>
          ),
      )}
      {layout.mixer !== null && <Mixer position={[layout.mixer, 0, 0.02]} />}
      <Crate
        position={[layout.crate.x, 0, layout.crate.z]}
        records={mixes}
        selected={selected}
        flights={flights}
        loaded={loaded}
        assets={assets}
        delay={0.75}
        onFlip={onFlip}
        onPlay={onPlay}
        onHover={(over) => void (overCrate.current = over)}
        slots={slots}
      />
      {flights.map((flight) => (
        <FlyingRecord key={flight.id} flight={flight} assets={assets} slots={slots} landing={landings[flight.deck]} />
      ))}
    </>
  )
}

/**
 * The camera. It arrives with a dolly in from further back and frames whatever the layout holds. At first it's low
 * and cinematic, the neon sign behind the decks; as the page scrolls through the booth it cranes up and over the
 * desk until it's looking down on the decks like the DJ.
 */
function Rig({ layout, scroll }: { layout: DeskLayout; scroll: RefObject<DeskScroll> }) {
  const camera = useThree((state) => state.camera) as PerspectiveCamera
  const born = useRef(-1)
  const target = useRef(new Vector3())
  const eye = useRef(new Vector3())
  const settled = useRef(false)

  useFrame((state, delta) => {
    if (born.current < 0) born.current = seconds()
    // The layout's lens: wider on tall screens.
    const lens = state.camera as PerspectiveCamera
    if (lens.fov !== layout.fov) {
      lens.fov = layout.fov
      lens.updateProjectionMatrix()
    }
    const intro = ease(MathUtils.clamp((seconds() - born.current - 0.05) / 1.7, 0, 1))
    const over = MathUtils.smoothstep(scroll.current?.over ?? 0, 0.03, 0.97)
    const aspect = state.size.width / Math.max(1, state.size.height)
    const left = MathUtils.lerp(layout.span[0], layout.overhead[0], over)
    const right = MathUtils.lerp(layout.span[1], layout.overhead[1], over)
    const half = (right - left) / 2
    const across = Math.atan(Math.tan(MathUtils.degToRad(camera.fov) / 2) * aspect)
    const fit = (half * MathUtils.lerp(1.1, 1.05, over)) / Math.tan(across)
    const distance = fit * MathUtils.lerp(1.45, 1, intro)
    const elevation = MathUtils.lerp(0.17, layout.tilt, over) + (1 - intro) * 0.12
    const yaw = MathUtils.lerp(-0.03, 0, over)
    const aim = target.current.set(
      (left + right) / 2,
      MathUtils.lerp(layout.aim.low[0], layout.aim.over[0], over),
      MathUtils.lerp(layout.aim.low[1], layout.aim.over[1], over),
    )
    const want = eye.current.set(
      aim.x + Math.sin(yaw) * Math.cos(elevation) * distance,
      aim.y + Math.sin(elevation) * distance,
      aim.z + Math.cos(yaw) * Math.cos(elevation) * distance,
    )
    // Ease towards the pose, so scrolling glides rather than steps.
    const follow = settled.current ? 1 - Math.exp(-6 * Math.min(delta, 0.05)) : 1
    camera.position.lerp(want, follow)
    camera.lookAt(aim)
    settled.current = true
    if (intro < 1 || camera.position.distanceTo(want) > 0.0005) state.invalidate()
  })
  return null
}

/** Keeps frames coming while something on the desk is still moving (see `keepDrawing`). */
function Driver() {
  useFrame((state) => {
    if (performance.now() < deskActivity.until) state.invalidate()
  })
  return null
}

/**
 * The page's gestures on the canvas: scrolling over the crate flicks through it rather than scrolling the page, and
 * a finger playing a control (the arm, a record, a fader) doesn't scroll the page either.
 */
function Gestures({ overCrate, onFlip }: { overCrate: RefObject<boolean>; onFlip: (step: number) => void }) {
  const canvas = useThree((state) => state.gl.domElement)
  const flip = useRef(onFlip)
  useEffect(() => {
    flip.current = onFlip
  })
  useEffect(() => {
    let spare = 0
    let last = 0
    const wheel = (event: WheelEvent) => {
      if (!overCrate.current) return
      event.preventDefault()
      const scale = event.deltaMode === 1 ? 32 : event.deltaMode === 2 ? 400 : 1
      const delta = (Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX) * scale
      if (Math.sign(delta) !== Math.sign(spare)) spare = 0
      spare += delta
      const now = performance.now()
      if (Math.abs(spare) < WHEEL_FLICK || now - last < WHEEL_GAP) return
      flip.current(Math.sign(spare))
      spare = 0
      last = now
    }
    const touch = (event: TouchEvent) => {
      if (dragging.count > 0) event.preventDefault()
    }
    canvas.addEventListener('wheel', wheel, { passive: false })
    canvas.addEventListener('touchmove', touch, { passive: false })
    return () => {
      canvas.removeEventListener('wheel', wheel)
      canvas.removeEventListener('touchmove', touch)
    }
  }, [canvas, overCrate])
  return null
}

/** Reports where deck 1 is on screen, for the note pointing at it, when it moves. */
function Anchors({ layout, onAnchors }: { layout: DeskLayout; onAnchors: (anchors: DeskAnchors) => void }) {
  const point = useRef(new Vector3())
  const last = useRef('')
  useFrame(({ camera, size }) => {
    const at = point.current.set(layout.deckA - 0.13, DECK_Y + 0.03, layout.deckZ + 0.1).project(camera)
    const deck: [number, number] = [(at.x * 0.5 + 0.5) * size.width, (0.5 - at.y * 0.5) * size.height]
    const key = `${Math.round(deck[0])},${Math.round(deck[1])},${layout.id}`
    if (key === last.current) return
    last.current = key
    onAnchors({ deck, decks: layout.deckB === null ? 1 : 2 })
  })
  return null
}
