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

/**
 * How the page has scrolled: `over` from the top to just before the Casa TV room takes the screen (0–1), which
 * cranes the camera over the desk, and `page` over the whole page (0–1).
 */
export interface DeskScroll {
  over: number
  page: number
}

/** Screen positions (px, in the canvas) for the page's labels, and how many decks the desk has room for. */
export interface DeskAnchors {
  /** Deck 1, for the note pointing at it. */
  deck: [number, number]
  /** The top of the record showing in the crate. */
  crate: [number, number]
  decks: 1 | 2
}

interface DeskCanvasProps {
  desk: readonly [DeckState, DeckState]
  selected: number
  flights: Flight[]
  /** Draw frames at all: off while the Casa TV room has the screen. */
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
 * The DJ desk along the bottom of the landing page: headphones, two decks and a mixer, and a crate of records to
 * dig through, in a booth under a neon sign. It's all playable. Rendered straight to the screen like the other 3D
 * (no post-processing), and only while something moves.
 */
export default function DeskCanvas({ active, onReady, ...props }: DeskCanvasProps) {
  return (
    <Canvas
      className="dj-desk-canvas"
      frameloop={active ? 'demand' : 'never'}
      shadows="percentage"
      dpr={[1, 1.6]}
      camera={{ fov: 22, near: 0.05, far: 10, position: [0, 0.5, 2] }}
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
  const crateTop = useRef(new Vector3())
  const slots = useRef<Slot[]>([])
  const overCrate = useRef(false)
  const landings = useMemo(
    () => [layout.deckA, layout.deckB ?? layout.deckA].map((x) => new Vector3(x, DECK_Y + RECORD_TOP + 0.001, 0)),
    [layout.deckA, layout.deckB],
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
      <Anchors layout={layout} crate={crateTop} onAnchors={onAnchors} />

      <Headphones position={[layout.headphones, 0, 0.05]} assets={assets} delay={0.5} onToggle={onToggle} />
      {decks.map(
        (x, i) =>
          x !== null && (
            <group key={i} position={[x, DECK_Y, 0]}>
              <Turntable deck={desk[i]} index={i as DeckIndex} pageShadow={false} playable onTap={() => onTap(i as DeckIndex)} />
            </group>
          ),
      )}
      {layout.mixer !== null && <Mixer position={[layout.mixer, 0, 0.02]} />}
      <Crate
        position={[layout.crate, 0, 0.03]}
        records={mixes}
        selected={selected}
        flights={flights}
        loaded={loaded}
        assets={assets}
        delay={0.75}
        onFlip={onFlip}
        onPlay={onPlay}
        onHover={(over) => void (overCrate.current = over)}
        anchor={crateTop}
        slots={slots}
      />
      {flights.map((flight) => (
        <FlyingRecord key={flight.id} flight={flight} assets={assets} slots={slots} landing={landings[flight.deck]} />
      ))}
    </>
  )
}

/**
 * The camera. It arrives with a dolly in from further back and frames whatever the layout holds. At the top of the
 * page it's low and cinematic, the neon sign behind the decks; as the page scrolls it cranes up and over the desk
 * until it's looking down on the decks like the DJ, and drifts gently along the desk as the page goes on.
 */
function Rig({ layout, scroll }: { layout: DeskLayout; scroll: RefObject<DeskScroll> }) {
  const camera = useThree((state) => state.camera) as PerspectiveCamera
  const born = useRef(-1)
  const target = useRef(new Vector3())
  const eye = useRef(new Vector3())
  const settled = useRef(false)

  useFrame((state, delta) => {
    if (born.current < 0) born.current = seconds()
    const intro = ease(MathUtils.clamp((seconds() - born.current - 0.05) / 1.7, 0, 1))
    const { over: craned, page } = scroll.current ?? { over: 0, page: 0 }
    // How far over the desk the camera has craned: none at the top of the page, all of it by the TV room.
    const over = MathUtils.smoothstep(craned, 0.03, 0.97)
    const aspect = state.size.width / Math.max(1, state.size.height)
    const left = MathUtils.lerp(layout.span[0], layout.overhead[0], over)
    const right = MathUtils.lerp(layout.span[1], layout.overhead[1], over)
    const half = (right - left) / 2
    const across = Math.atan(Math.tan(MathUtils.degToRad(camera.fov) / 2) * aspect)
    const fit = (half * MathUtils.lerp(1.12, 1.06, over)) / Math.tan(across)
    const distance = fit * MathUtils.lerp(1.45, 1, intro)
    const elevation = MathUtils.lerp(0.17, layout.tilt, over) + (1 - intro) * 0.12
    const drift = page - 0.5
    const yaw = MathUtils.lerp(-0.03, 0, over) + drift * MathUtils.lerp(0.08, 0.02, over)
    const aim = target.current.set(
      (left + right) / 2 + drift * MathUtils.lerp(0.06, 0.02, over),
      MathUtils.lerp(0.13, 0.07, over),
      MathUtils.lerp(0, 0.005, over),
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

/** Reports where the page's labels go on screen, when they move. */
function Anchors({
  layout,
  crate,
  onAnchors,
}: {
  layout: DeskLayout
  crate: RefObject<Vector3>
  onAnchors: (anchors: DeskAnchors) => void
}) {
  const point = useRef(new Vector3())
  const last = useRef('')
  useFrame(({ camera, size }) => {
    const toScreen = (v: Vector3): [number, number] => {
      v.project(camera)
      return [(v.x * 0.5 + 0.5) * size.width, (0.5 - v.y * 0.5) * size.height]
    }
    const deck = toScreen(point.current.set(layout.deckA - 0.13, DECK_Y + 0.03, 0.1))
    const front = toScreen(point.current.copy(crate.current))
    const key = [...deck, ...front, layout.id].map((value) => (typeof value === 'number' ? Math.round(value) : value)).join()
    if (key === last.current) return
    last.current = key
    onAnchors({ deck, crate: front, decks: layout.deckB === null ? 1 : 2 })
  })
  return null
}
