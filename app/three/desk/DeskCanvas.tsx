import { useCursor } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { MathUtils, NeutralToneMapping, Vector3, type PerspectiveCamera } from 'three'
import { mixes } from '../../content/radio'
import type { Mix } from '../../content/types'
import type { RadioState } from '../../lib/casaSound'
import { loadTvAssets, type TvAssets } from '../channels'
import { RECORD_TOP } from '../turntable/arm'
import { Turntable } from '../turntable/Turntable'
import { BackWall, BoothLights, DeskTop } from './Booth'
import { Crate, FlyingRecord } from './Crate'
import { Headphones } from './Headphones'
import { deskActivity, deskLayout, keepDrawing, seconds, type DeskLayout } from './layout'
import { Mixer } from './Mixer'

/** How the page has scrolled: `hero` over the first screenful (0–1), `page` over the whole page (0–1). */
export interface DeskScroll {
  hero: number
  page: number
}

/** Screen positions (px, in the canvas) of the playing deck and the crate's front record, for the page's labels. */
export interface DeskAnchors {
  deck: [number, number]
  crate: [number, number]
}

interface Flight {
  index: number
  start: number
}

interface DeskCanvasProps {
  radio: RadioState
  selected: number
  flight: Flight | null
  /** Draw frames at all: off while the Casa TV room has the screen. */
  active: boolean
  scroll: RefObject<DeskScroll>
  onToggle: () => void
  onFlip: () => void
  onPlay: (index: number) => void
  onAnchors: (anchors: DeskAnchors) => void
  onReady: () => void
}

/** The turntables' feet stand on the desk; their spindles sit this high above it. */
const DECK_Y = 0.096
/** The second deck's record, waiting for the next set. */
const SIDE_B: Mix = { id: 'side-b', title: 'Side B', artist: 'Casa records' }
const ease = (t: number) => 1 - (1 - t) ** 3

/**
 * The DJ desk along the bottom of the landing page: headphones, two decks and a mixer, and a crate of records to
 * flick through and play, in a booth under a neon sign. Rendered straight to the screen like the other 3D (no
 * post-processing), and only while something moves.
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

function Scene({ radio, selected, flight, scroll, onToggle, onFlip, onPlay, onAnchors }: Omit<DeskCanvasProps, 'active' | 'onReady'>) {
  const size = useThree((state) => state.size)
  const invalidate = useThree((state) => state.invalidate)
  const layout = deskLayout(size.width / Math.max(1, size.height))
  const [assets, setAssets] = useState<TvAssets | null>(null)
  const [deckHovered, setDeckHovered] = useState(false)
  useCursor(deckHovered)
  const crateTop = useRef(new Vector3())
  const landing = useMemo(() => new Vector3(layout.deckA, DECK_Y + RECORD_TOP + 0.001, 0), [layout.deckA])

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
      keepDrawing(700)
      invalidate()
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [invalidate])

  const centre = (layout.span[0] + layout.span[1]) / 2
  return (
    <>
      <BoothLights />
      <BackWall centre={centre} sign={layout.sign} assets={assets} />
      <DeskTop centre={centre} />
      <Rig layout={layout} scroll={scroll} />
      <Driver />
      <Anchors layout={layout} crate={crateTop} onAnchors={onAnchors} />

      <Headphones position={[layout.headphones, 0, 0.05]} assets={assets} delay={0.5} onToggle={onToggle} />
      <group
        position={[layout.deckA, DECK_Y, 0]}
        onClick={(event) => {
          event.stopPropagation()
          keepDrawing()
          onToggle()
        }}
        onPointerOver={(event) => {
          event.stopPropagation()
          setDeckHovered(true)
        }}
        onPointerOut={() => setDeckHovered(false)}
      >
        <Turntable on={radio.on} since={radio.since} mix={radio.mix} pageShadow={false} />
      </group>
      {layout.mixer !== null && <Mixer position={[layout.mixer, 0, 0.02]} on={radio.on} />}
      {layout.deckB !== null && (
        <group position={[layout.deckB, DECK_Y, 0]}>
          <Turntable on={false} since={0} mix={SIDE_B} pageShadow={false} />
        </group>
      )}
      <Crate
        position={[layout.crate, 0, 0.03]}
        records={mixes}
        selected={selected}
        flight={flight}
        assets={assets}
        delay={0.75}
        onFlip={onFlip}
        onPlay={onPlay}
        anchor={crateTop}
      />
      <FlyingRecord flight={flight} mix={flight ? mixes[flight.index] : null} assets={assets} from={crateTop} to={landing} />
    </>
  )
}

/**
 * The camera. It arrives with a dolly in from further back, frames whatever the layout holds, and follows the
 * page: low and cinematic at the top, rising to look down on the desk a screen later, and drifting along the desk
 * as the page goes on.
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
    const { hero, page } = scroll.current ?? { hero: 0, page: 0 }
    const aspect = state.size.width / Math.max(1, state.size.height)
    const [left, right] = layout.span
    const half = (right - left) / 2
    const across = Math.atan(Math.tan(MathUtils.degToRad(camera.fov) / 2) * aspect)
    const fit = (half * 1.12) / Math.tan(across)
    const distance = fit * MathUtils.lerp(1.45, 1, intro) * MathUtils.lerp(1, 1.05, hero)
    const elevation = MathUtils.lerp(0.17, 0.26, hero) + (1 - intro) * 0.12
    const yaw = MathUtils.lerp(-0.03, 0.04, hero) + (page - 0.5) * 0.08
    const aim = target.current.set((left + right) / 2 + (page - 0.5) * 0.06, 0.13 - hero * 0.015, 0)
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

/** Reports where the deck and the crate's front record are on screen, when they move. */
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
    const front = crate.current ? toScreen(point.current.copy(crate.current)) : deck
    const key = [...deck, ...front].map(Math.round).join()
    if (key === last.current) return
    last.current = key
    onAnchors({ deck, crate: front })
  })
  return null
}
