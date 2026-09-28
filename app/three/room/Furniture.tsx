import { useCursor } from '@react-three/drei'
import { useFrame, type ThreeElements, type ThreeEvent } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  Object3D,
  Shape,
  ShapeGeometry,
  type Group,
  type InstancedMesh,
  type MeshBasicMaterial,
  type MeshStandardMaterial,
  type PointLight,
  type ShaderMaterial,
  type SpotLight,
  type SpriteMaterial,
} from 'three'
import { palette } from '../../brand/brand'
import type { TvAssets } from '../channels'
import { useLampLevel } from './lampLevel'
import {
  glowTexture,
  groovesTexture,
  labelTexture,
  leafTexture,
  shadeTexture,
  sleeveTexture,
  walnutTexture,
} from './textures'

type WithMotion = ThreeElements['group'] & { reducedMotion: boolean }

/* ---------- Lamps ---------- */

interface Switchable {
  on: boolean
  onToggle: () => void
}

/** Click to switch; the pointer shows it's clickable. Stops the click reaching the set underneath. */
function useSwitch(onToggle: () => void) {
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)
  return {
    onClick: (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation()
      onToggle()
    },
    onPointerOver: (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation()
      setHovered(true)
    },
    onPointerOut: () => setHovered(false),
  }
}

// The bulb's glow when on, and the dull glass when off.
const BULB = { on: new Color(6, 4.2, 2.6), off: new Color(0.16, 0.13, 0.1) }

/** Hands clicks and hovers to the lamp around it, never to its light or glow. */
const noRaycast = () => null

const coneVertex = /* glsl */ `
varying float vHeight;
varying float vFacing;

void main() {
  vHeight = uv.y;
  vec4 view = modelViewMatrix * vec4(position, 1.0);
  vFacing = abs(dot(normalize(normalMatrix * normal), normalize(-view.xyz)));
  gl_Position = projectionMatrix * view;
}
`

// Light falling from under the shade: brightest at the top, gone by the floor, soft at the silhouette edges.
const coneFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uStrength;
varying float vHeight;
varying float vFacing;

void main() {
  float light = uStrength * pow(vHeight, 1.8) * pow(vFacing, 2.0);
  gl_FragColor = vec4(uColor * light, 1.0);
}
`

/**
 * A standard lamp with a linen drum shade. Its light, glow and the beam under it all breathe together. Click it to
 * switch it off and on.
 */
export function FloorLamp({ reducedMotion, aim, on, onToggle, ...props }: WithMotion & Switchable & { aim: number }) {
  const spot = useRef<SpotLight>(null)
  const fill = useRef<PointLight>(null)
  const shade = useRef<MeshStandardMaterial>(null)
  const bulb = useRef<MeshBasicMaterial>(null)
  const glow = useRef<SpriteMaterial>(null)
  const beam = useRef<ShaderMaterial>(null)
  const [target] = useState(() => new Object3D())
  const halo = useMemo(() => glowTexture(), [])
  const linen = useMemo(() => shadeTexture(), [])
  const [beamUniforms] = useState(() => ({ uColor: { value: new Color('#ffa25a') }, uStrength: { value: 0.1 } }))
  const lit = useLampLevel(on, reducedMotion)
  const handlers = useSwitch(onToggle)

  useFrame(({ clock }, delta) => {
    const { power, level } = lit(clock.elapsedTime, delta)
    if (spot.current) spot.current.intensity = 34 * level * power
    if (fill.current) fill.current.intensity = 5 * level * power
    if (shade.current) shade.current.emissiveIntensity = (0.6 + 1.2 * level) * power
    bulb.current?.color.lerpColors(BULB.off, BULB.on, power)
    if (glow.current) glow.current.opacity = (0.18 + 0.28 * level) * power
    if (beam.current) beam.current.uniforms.uStrength.value = (0.05 + 0.08 * level) * power
  })

  return (
    <group {...props} {...handlers}>
      <mesh position={[0, 0.03, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.24, 0.3, 0.06, 40]} />
        <meshStandardMaterial color="#c49a5c" metalness={1} roughness={0.32} />
      </mesh>
      <mesh position={[0, 1.02, 0]} castShadow>
        <cylinderGeometry args={[0.016, 0.02, 1.96, 12]} />
        <meshStandardMaterial color="#c49a5c" metalness={1} roughness={0.28} />
      </mesh>
      <mesh position={[0, 2.16, 0]}>
        <cylinderGeometry args={[0.34, 0.42, 0.44, 48, 1, true]} />
        <meshStandardMaterial
          ref={shade}
          map={linen}
          emissiveMap={linen}
          emissive="#ffffff"
          emissiveIntensity={1}
          side={DoubleSide}
          roughness={0.85}
        />
      </mesh>
      <mesh position={[0, 2.04, 0]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshBasicMaterial ref={bulb} color={BULB.on} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.97, 0]} raycast={noRaycast}>
        <cylinderGeometry args={[0.4, 1.35, 1.88, 40, 1, true]} />
        <shaderMaterial
          ref={beam}
          vertexShader={coneVertex}
          fragmentShader={coneFragment}
          uniforms={beamUniforms}
          blending={AdditiveBlending}
          transparent
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
      <primitive object={target} position={[aim, 0, 1.2]} />
      <spotLight
        ref={spot}
        position={[0, 2, 0]}
        target={target}
        angle={0.95}
        penumbra={0.9}
        color="#ffa257"
        intensity={30}
        distance={11}
        decay={1.8}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-radius={6}
      />
      <pointLight ref={fill} position={[0, 2.3, 0.1]} color="#ff9447" intensity={5} distance={8} decay={1.8} />
      <sprite position={[0, 2.12, 0.05]} scale={[2.4, 2.4, 1]} raycast={noRaycast}>
        <spriteMaterial ref={glow} map={halo} color="#ff9a4d" blending={AdditiveBlending} transparent depthWrite={false} />
      </sprite>
    </group>
  )
}

/** A little mushroom lamp on top of the set, breathing out of step with the floor lamp. Click it to switch it. */
export function TableLamp({ reducedMotion, on, onToggle, ...props }: WithMotion & Switchable) {
  const bulb = useRef<PointLight>(null)
  const dome = useRef<MeshStandardMaterial>(null)
  const lit = useLampLevel(on, reducedMotion, 3.4)
  const handlers = useSwitch(onToggle)

  useFrame(({ clock }, delta) => {
    const { power, level } = lit(clock.elapsedTime, delta)
    if (bulb.current) bulb.current.intensity = 4 * level * power
    if (dome.current) dome.current.emissiveIntensity = (0.8 + 1.4 * level) * power
  })

  return (
    <group {...props} {...handlers}>
      <mesh position={[0, 0.02, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.15, 0.04, 32]} />
        <meshStandardMaterial color="#c49a5c" metalness={1} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.17, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.05, 0.28, 20]} />
        <meshStandardMaterial color="#efe0c8" roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.3, 0]}>
        <sphereGeometry args={[0.22, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          ref={dome}
          color="#f3c28a"
          emissive="#ff9a4d"
          emissiveIntensity={1.4}
          side={DoubleSide}
          roughness={0.6}
        />
      </mesh>
      <pointLight ref={bulb} position={[0, 0.26, 0.05]} color="#ffa257" intensity={4} distance={5} decay={1.6} />
    </group>
  )
}

/* ---------- The plant ---------- */

/** One leaf: a pointed oval arched along its length and folded at the midrib, textured end to end. */
function leafGeometry() {
  const shape = new Shape()
  shape.moveTo(0, 0)
  shape.bezierCurveTo(0.2, 0.12, 0.24, 0.46, 0, 0.78)
  shape.bezierCurveTo(-0.24, 0.46, -0.2, 0.12, 0, 0)
  const geometry = new ShapeGeometry(shape, 16)
  const position = geometry.attributes.position
  const uv = geometry.attributes.uv
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i)
    const y = position.getY(i)
    uv.setXY(i, (x + 0.24) / 0.48, y / 0.78)
    position.setZ(i, 0.28 * y * y + 0.18 * Math.abs(x))
  }
  geometry.computeVertexNormals()
  return geometry
}

/** Leaves spiralling up the stem at the golden angle, larger and more open at the bottom. */
function leafLayout(count: number) {
  let seed = 7
  const random = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  return Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1)
    return {
      position: [(random() - 0.5) * 0.12, 0.15 + t * 1.25, (random() - 0.5) * 0.12] as const,
      turn: i * 2.39996 + random() * 0.4,
      tilt: -(0.55 + random() * 0.55) * (1 - t * 0.35),
      scale: 0.8 + (1 - t) * 0.5 + random() * 0.15,
      shade: (random() - 0.5) * 0.12,
    }
  })
}

export function Plant({ reducedMotion, ...props }: WithMotion) {
  const crown = useRef<Group>(null)
  const leaves = useRef<InstancedMesh>(null)
  const geometry = useMemo(() => leafGeometry(), [])
  const layout = useMemo(() => leafLayout(22), [])
  const leaf = useMemo(() => leafTexture(), [])

  useLayoutEffect(() => {
    const mesh = leaves.current
    if (!mesh) return
    const dummy = new Object3D()
    const colour = new Color()
    layout.forEach((item, i) => {
      dummy.position.set(...item.position)
      dummy.rotation.set(item.tilt, item.turn, 0, 'YXZ')
      dummy.scale.setScalar(item.scale)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      mesh.setColorAt(i, colour.setHSL(0.2, 0.25, 0.8 + item.shade))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [layout])

  useFrame(({ clock }) => {
    if (reducedMotion || !crown.current) return
    crown.current.rotation.z = Math.sin(clock.elapsedTime * 0.55) * 0.02
    crown.current.rotation.x = Math.sin(clock.elapsedTime * 0.4 + 1) * 0.015
  })

  return (
    <group {...props}>
      <mesh position={[0, 0.31, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.34, 0.26, 0.62, 36]} />
        <meshStandardMaterial color="#9a5132" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.37, 0.35, 0.08, 36]} />
        <meshStandardMaterial color="#a55a38" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.625, 0]}>
        <cylinderGeometry args={[0.31, 0.31, 0.02, 24]} />
        <meshStandardMaterial color="#1a100b" roughness={1} />
      </mesh>
      <group ref={crown} position={[0, 0.62, 0]}>
        <mesh position={[0, 0.7, 0]} castShadow>
          <cylinderGeometry args={[0.012, 0.02, 1.4, 6]} />
          <meshStandardMaterial color="#3d4a2c" roughness={0.8} />
        </mesh>
        <instancedMesh ref={leaves} args={[geometry, undefined, layout.length]} castShadow>
          <meshStandardMaterial map={leaf} side={DoubleSide} roughness={0.55} />
        </instancedMesh>
      </group>
    </group>
  )
}

/* ---------- Records ---------- */

// Hung clear of the section title in the top left. Tall screens bunch them over the set.
const RECORDS = [
  { wide: [-1.0, 3.6, -2.3], tall: [-0.85, 3.95, -2.4], label: palette.orange, phase: 0 },
  { wide: [1.25, 3.4, -1.9], tall: [0.55, 4.25, -2.8], label: palette.pink, phase: 2.1 },
  { wide: [3.1, 3.75, -2.6], tall: [1.35, 3.7, -1.9], label: palette.red, phase: 4.2 },
] as const

export function HangingRecords({
  portrait,
  assets,
  reducedMotion,
}: {
  portrait: boolean
  assets: TvAssets | null
  reducedMotion: boolean
}) {
  const records = useRef<(Group | null)[]>([])
  const grooves = useMemo(() => groovesTexture(), [])
  const labels = useMemo(() => RECORDS.map((record) => labelTexture(record.label, assets)), [assets])

  useFrame(({ clock }) => {
    if (reducedMotion) return
    const t = clock.elapsedTime
    RECORDS.forEach((record, i) => {
      const group = records.current[i]
      if (!group) return
      group.rotation.y = Math.sin(t * 0.22 + record.phase) * 0.9
      group.rotation.z = Math.sin(t * 0.37 + record.phase) * 0.04
    })
  })

  return RECORDS.map((record, i) => (
    <group
      key={record.label}
      ref={(group) => {
        records.current[i] = group
      }}
      position={portrait ? record.tall : record.wide}
    >
      <mesh position={[0, 1.4, 0]}>
        <cylinderGeometry args={[0.004, 0.004, 2.8, 4]} />
        <meshStandardMaterial color="#c9c1b5" />
      </mesh>
      <group position={[0, -0.5, 0]}>
        <mesh rotation-x={Math.PI / 2} castShadow>
          <cylinderGeometry args={[0.5, 0.5, 0.012, 72]} />
          <meshPhysicalMaterial
            map={grooves}
            color="#ffffff"
            roughness={0.32}
            metalness={0.2}
            clearcoat={1}
            clearcoatRoughness={0.12}
          />
        </mesh>
        {[1, -1].map((side) => (
          <mesh key={side} position={[0, 0, side * 0.0068]} rotation-y={side < 0 ? Math.PI : 0}>
            <circleGeometry args={[0.17, 48]} />
            <meshStandardMaterial map={labels[i]} roughness={0.6} />
          </mesh>
        ))}
      </group>
    </group>
  ))
}

// Spines of the sleeves standing in the crate, in the brand's colours and a few worn card tones.
const SPINES = [
  palette.charcoal,
  palette.cream,
  palette.red,
  '#3a2a22',
  palette.pink,
  palette.stone,
  palette.orange,
  '#1d1d1f',
  palette.green,
  '#b9a58c',
  palette.charcoal,
  palette.red,
]

/** A pine crate of records on the floor, with one sleeve leaning on the front. */
export function RecordCrate({ assets, ...props }: ThreeElements['group'] & { assets: TvAssets | null }) {
  const wood = useMemo(() => walnutTexture(), [])
  const cover = useMemo(() => sleeveTexture(assets), [assets])
  const width = 0.8
  const depth = 0.5
  const height = 0.42
  const board = 0.025
  const crate = <meshStandardMaterial map={wood} color="#e3b88a" roughness={0.7} />

  return (
    <group {...props}>
      <mesh position={[0, board / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, board, depth]} />
        {crate}
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={`side${side}`} position={[side * (width / 2 - board / 2), height / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[board, height, depth]} />
          {crate}
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh key={`end${side}`} position={[0, height * 0.32, side * (depth / 2 - board / 2)]} castShadow receiveShadow>
          <boxGeometry args={[width, height * 0.64, board]} />
          {crate}
        </mesh>
      ))}
      {SPINES.map((colour, i) => (
        <mesh
          key={`${colour}${i}`}
          position={[0, board + 0.31, -depth / 2 + 0.07 + i * 0.03]}
          rotation-x={-0.08 - (i % 3) * 0.05}
          castShadow
        >
          <boxGeometry args={[0.62, 0.62, 0.012]} />
          <meshStandardMaterial color={colour} roughness={0.75} />
        </mesh>
      ))}
      <mesh position={[0.04, 0.3, depth / 2 + 0.09]} rotation-x={-0.24} castShadow receiveShadow>
        <boxGeometry args={[0.62, 0.62, 0.012]} />
        <meshStandardMaterial map={cover} roughness={0.65} />
      </mesh>
    </group>
  )
}
