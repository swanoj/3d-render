import { useCursor } from '@react-three/drei'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useMemo, useRef, useState } from 'react'
import {
  CatmullRomCurve3,
  Curve,
  EllipseCurve,
  MathUtils,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  TubeGeometry,
  Vector3,
  type Group,
} from 'three'
import { palette } from '../../brand/brand'
import { casaSound } from '../../lib/casaSound'
import { tinted, type TvAssets } from '../channels'
import { canvasTexture } from '../room/textures'
import { keepDrawing, seconds } from './layout'

const CUP = { radius: 0.047, depth: 0.03, x: 0.083 }
const CUP_Y = CUP.radius + 0.002
const UP = new Vector3(0, 1, 0)

/**
 * A curly headphone cable: a helix wound round a path, coiled for the first `coiled` share of its length and
 * straight after it, as a DJ's lead is.
 */
class CoiledCable extends Curve<Vector3> {
  private path: CatmullRomCurve3
  private coiled: number
  private turns: number
  private radius: number
  private tangent = new Vector3()
  private side = new Vector3()
  private lift = new Vector3()

  constructor(path: CatmullRomCurve3, coiled: number, turns: number, radius: number) {
    super()
    this.path = path
    this.coiled = coiled
    this.turns = turns
    this.radius = radius
  }

  getPoint(t: number, target = new Vector3()) {
    const point = this.path.getPointAt(t, target)
    if (t >= this.coiled) return point
    this.path.getTangentAt(t, this.tangent)
    this.side.crossVectors(this.tangent, UP).normalize()
    this.lift.crossVectors(this.side, this.tangent).normalize()
    const ease = Math.min(1, (this.coiled - t) / 0.04, t / 0.02)
    const angle = t * this.turns * Math.PI * 2
    return point
      .addScaledVector(this.side, Math.cos(angle) * this.radius * ease)
      .addScaledVector(this.lift, Math.sin(angle) * this.radius * ease)
  }
}

/** The arc of the headband, cup to cup, in the plane between them. */
function bandArc(radiusX: number, radiusY: number, from: number, to: number) {
  const ellipse = new EllipseCurve(0, 0, radiusX, radiusY, from, to, false, 0)
  return new CatmullRomCurve3(ellipse.getPoints(48).map((p) => new Vector3(p.x, p.y, 0)))
}

function cupBadge(assets: TvAssets | null) {
  return canvasTexture(128, 128, (ctx) => {
    ctx.fillStyle = '#141416'
    ctx.fillRect(0, 0, 128, 128)
    ctx.fillStyle = palette.orange
    ctx.beginPath()
    ctx.arc(64, 64, 52, 0, Math.PI * 2)
    ctx.fill()
    if (assets) ctx.drawImage(tinted(assets.submark, palette.cream, 58), 35, 39)
  })
}

interface HeadphonesProps {
  position: [number, number, number]
  assets: TvAssets | null
  /** Seconds to wait before dropping onto the desk, for the intro. */
  delay: number
  onToggle: () => void
}

/**
 * DJ headphones standing on the desk: padded band, swivel yokes, leather cushions and a curly lead running off
 * behind the deck. Tap them to play or pause Casa Radio; the cups thump very slightly with the kick.
 */
export function Headphones({ position, assets, delay, onToggle }: HeadphonesProps) {
  const invalidate = useThree((state) => state.invalidate)
  const group = useRef<Group>(null)
  const cups = useRef<(Group | null)[]>([])
  const born = useRef(-1)
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)

  const made = useMemo(
    () => ({
      plastic: new MeshPhysicalMaterial({ color: '#121214', roughness: 0.42, clearcoat: 0.3, clearcoatRoughness: 0.4 }),
      leather: new MeshPhysicalMaterial({
        color: '#1d1a18',
        roughness: 0.6,
        sheen: 0.5,
        sheenRoughness: 0.5,
        sheenColor: '#5a4c44',
      }),
      metal: new MeshPhysicalMaterial({ color: '#a2a2a6', metalness: 1, roughness: 0.26 }),
      fabric: new MeshStandardMaterial({ color: '#0e0e10', roughness: 1 }),
      cable: new MeshStandardMaterial({ color: '#0c0c0d', roughness: 0.45 }),
    }),
    [],
  )
  const badge = useMemo(() => new MeshStandardMaterial({ map: cupBadge(assets), roughness: 0.38, metalness: 0.1 }), [assets])

  const shapes = useMemo(() => {
    const top = CUP_Y + 0.058
    return {
      band: new TubeGeometry(bandArc(CUP.x, 0.1, 0, Math.PI), 64, 0.0034, 10, false),
      pad: new TubeGeometry(bandArc(CUP.x - 0.002, 0.1, Math.PI * 0.2, Math.PI * 0.8), 48, 0.011, 16, false),
      yoke: new TubeGeometry(
        new CatmullRomCurve3(
          new EllipseCurve(0, 0, 0.056, 0.056, -0.15, Math.PI + 0.15, false, 0)
            .getPoints(24)
            .map((p) => new Vector3(0, p.y, p.x)),
        ),
        32,
        0.0028,
        8,
        false,
      ),
      cable: new TubeGeometry(
        new CoiledCable(
          new CatmullRomCurve3([
            new Vector3(-CUP.x - 0.012, 0.012, -0.024),
            new Vector3(-CUP.x - 0.05, 0.009, -0.08),
            new Vector3(-0.06, 0.009, -0.17),
            new Vector3(0.1, 0.009, -0.2),
            new Vector3(0.28, 0.009, -0.21),
            new Vector3(0.46, 0.009, -0.2),
          ]),
          0.55,
          46,
          0.0068,
        ),
        900,
        0.0019,
        6,
        false,
      ),
      top,
    }
  }, [])

  useFrame((state, delta) => {
    const g = group.current
    if (!g) return
    if (born.current < 0) born.current = seconds()
    // Drop onto the desk with a little bounce, then lift an inch when hovered.
    const t = MathUtils.clamp((seconds() - born.current - delay) / 0.7, 0, 1)
    const drop = t < 1 ? (1 - t) ** 2 * 0.3 - Math.sin(t * Math.PI) * 0.012 * t : 0
    const lift = MathUtils.damp(g.userData.lift ?? 0, hovered ? 0.014 : 0, 10, delta)
    g.userData.lift = lift
    g.position.set(position[0], position[1] + drop + lift, position[2])
    g.rotation.y = 0.3 + lift * 6
    const thump = 1 + casaSound.pulse() * 0.025
    for (const cup of cups.current) cup?.scale.setScalar(thump)
    if (t < 1) state.invalidate()
  })

  const hover = (on: boolean) => (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    setHovered(on)
    keepDrawing()
    invalidate()
  }

  return (
    <group
      ref={group}
      position={position}
      onClick={(event) => {
        event.stopPropagation()
        keepDrawing()
        onToggle()
      }}
      onPointerOver={hover(true)}
      onPointerOut={hover(false)}
    >
      {[-1, 1].map((side, i) => (
        <group key={side} position={[side * CUP.x, CUP_Y, 0]}>
          <group ref={(node) => void (cups.current[i] = node)}>
            {/* The cup, its metal trim and the Casa badge outside; the cushion and grille inside. */}
            <mesh rotation-z={Math.PI / 2} material={made.plastic} castShadow receiveShadow>
              <cylinderGeometry args={[CUP.radius, CUP.radius * 0.94, CUP.depth, 48]} />
            </mesh>
            <mesh position={[side * (CUP.depth / 2 + 0.0005), 0, 0]} rotation-y={(side * Math.PI) / 2} material={made.metal}>
              <torusGeometry args={[CUP.radius * 0.9, 0.0026, 10, 48]} />
            </mesh>
            <mesh position={[side * (CUP.depth / 2 + 0.001), 0, 0]} rotation-y={(side * Math.PI) / 2} material={badge}>
              <circleGeometry args={[CUP.radius * 0.8, 40]} />
            </mesh>
            <mesh position={[-side * (CUP.depth / 2 + 0.008), 0, 0]} rotation-y={Math.PI / 2} material={made.leather} castShadow>
              <torusGeometry args={[0.035, 0.0125, 16, 48]} />
            </mesh>
            <mesh position={[-side * (CUP.depth / 2 + 0.002), 0, 0]} rotation-y={(-side * Math.PI) / 2} material={made.fabric}>
              <circleGeometry args={[0.028, 32]} />
            </mesh>
          </group>
          {/* The yoke round the cup, and the slider up into the band. */}
          <mesh geometry={shapes.yoke} material={made.metal} castShadow />
          <mesh position={[0, 0.069, 0]} material={made.metal} castShadow>
            <boxGeometry args={[0.005, 0.026, 0.012]} />
          </mesh>
        </group>
      ))}
      <group position={[0, CUP_Y + 0.082, 0]}>
        <mesh geometry={shapes.band} material={made.metal} castShadow />
        <mesh geometry={shapes.pad} material={made.leather} scale-z={1.7} castShadow />
      </group>
      <mesh geometry={shapes.cable} material={made.cable} castShadow />
    </group>
  )
}
