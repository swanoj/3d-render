import { ContactShadows, RoundedBox, useCursor } from '@react-three/drei'
import { Canvas, useFrame, useThree, type ThreeElements } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  DoubleSide,
  ExtrudeGeometry,
  LinearMipmapLinearFilter,
  MathUtils,
  Object3D,
  Path,
  PlaneGeometry,
  RepeatWrapping,
  Shape,
  ShapeGeometry,
  SRGBColorSpace,
  type Group,
  type InstancedMesh,
  type Mesh,
  type MeshStandardMaterial,
  type PointLight,
  type ShaderMaterial,
  type SpotLight,
  type SpriteMaterial,
} from 'three'
import { palette } from '../brand/brand'
import { CHANNELS, drawChannel, loadTvAssets, SCREEN, type TvAssets, type TvData } from './channels'
import { screenFragment, screenVertex } from './tv-screen.glsl'

/*
 * The room from the concept deck: a warm corner with an old TV as the feature, a lamp whose light breathes
 * instead of flashing, a plant in subdued green, and records hanging overhead. Everything is built from
 * primitives, so there are no model files to load.
 */

interface RoomCanvasProps {
  channel: number
  data: TvData
  /** False while the section is off screen, which stops rendering entirely. */
  active: boolean
  reducedMotion: boolean
  onNext: () => void
  /** Called once the renderer exists, so the flat fallback TV can step aside. */
  onReady?: () => void
}

export default function RoomCanvas(props: RoomCanvasProps) {
  const { active, reducedMotion, onReady } = props
  return (
    <Canvas
      className="room-canvas"
      shadows="percentage"
      dpr={[1, 1.75]}
      camera={{ position: [0, 1.8, 9], fov: 32, near: 0.1, far: 40 }}
      frameloop={active ? (reducedMotion ? 'demand' : 'always') : 'never'}
      gl={{ antialias: true }}
      onCreated={() => onReady?.()}
    >
      <color attach="background" args={['#170e0a']} />
      <fog attach="fog" args={['#170e0a', 11, 24]} />
      <hemisphereLight args={['#ffb27a', '#1a0c06', 0.8]} />
      <Room {...props} />
    </Canvas>
  )
}

/**
 * Wide screens see the whole corner: plant, set and lamp side by side. Tall screens close in on the set and stand
 * the lamp and plant just behind it, so they still show around its edges.
 */
function useLayout() {
  const size = useThree((state) => state.size)
  const aspect = size.width / Math.max(size.height, 1)
  const portrait = aspect < 1
  return {
    portrait,
    distance: portrait ? MathUtils.clamp(5.2 / aspect, 8.6, 12) : Math.max(8.2, 11 / aspect),
    lookAt: portrait ? 1.75 : 1.45,
    lamp: portrait ? { position: [1.3, 0, -1.8] as const, scale: 1.3 } : { position: [2.8, 0, -0.6] as const, scale: 1 },
    plant: portrait ? { position: [-1.3, 0, -1.6] as const, scale: 1.25 } : { position: [-2.75, 0, -0.45] as const, scale: 1 },
  }
}

function Room(props: RoomCanvasProps) {
  const { reducedMotion } = props
  const layout = useLayout()
  const rug = useMemo(() => rugTexture(), [])
  const planks = useMemo(() => floorTexture(), [])
  const wallWash = useRef<PointLight>(null)

  useFrame(({ clock }) => {
    if (wallWash.current) wallWash.current.intensity = 9 * breath((reducedMotion ? 2 : clock.elapsedTime) + 1.7)
  })

  return (
    <>
      <CameraRig distance={layout.distance} lookAt={layout.lookAt} reducedMotion={reducedMotion} />
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial map={planks} color="#6b4a38" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.006, 0.35]} rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[2.35, 72]} />
        <meshStandardMaterial map={rug} roughness={1} />
      </mesh>
      <mesh position={[0, 5, -3.4]} receiveShadow>
        <planeGeometry args={[40, 10]} />
        <meshStandardMaterial color="#5a2a17" roughness={0.95} />
      </mesh>
      {/* Warm light washing the wall behind the set, breathing out of step with the lamps. */}
      <pointLight ref={wallWash} position={[0, 2.3, -2.7]} color="#ff7a33" intensity={9} distance={6} decay={1.4} />
      <Television {...props} />
      <FloorLamp
        position={layout.lamp.position}
        scale={layout.lamp.scale}
        aim={-1}
        reducedMotion={reducedMotion}
      />
      <Plant position={layout.plant.position} scale={layout.plant.scale} reducedMotion={reducedMotion} />
      <HangingRecords portrait={layout.portrait} reducedMotion={reducedMotion} />
      <ContactShadows position={[0, 0.012, 0]} opacity={0.55} scale={14} blur={2.6} far={3.5} resolution={512} frames={1} />
    </>
  )
}

interface CameraRigProps {
  distance: number
  lookAt: number
  reducedMotion: boolean
}

/** Holds the framing for the screen shape, then drifts a little and follows the pointer. */
function CameraRig({ distance, lookAt, reducedMotion }: CameraRigProps) {
  const invalidate = useThree((state) => state.invalidate)
  useEffect(() => invalidate(), [distance, lookAt, invalidate])

  useFrame((state, rawDelta) => {
    const { camera, pointer, clock } = state
    const height = lookAt + 0.35
    if (reducedMotion) {
      camera.position.set(0, height, distance)
    } else {
      const delta = Math.min(rawDelta, 0.1)
      const drift = Math.sin(clock.elapsedTime * 0.12) * 0.25
      camera.position.x = MathUtils.damp(camera.position.x, pointer.x * 0.7 + drift, 2.5, delta)
      camera.position.y = MathUtils.damp(camera.position.y, height + pointer.y * 0.25, 2.5, delta)
      camera.position.z = MathUtils.damp(camera.position.z, distance, 3, delta)
    }
    camera.lookAt(0, lookAt, 0)
  })
  return null
}

/** A round vintage rug: concentric bands in the brand's reds with a thin cream ring. */
function rugTexture() {
  return canvasTexture(512, 512, (ctx) => {
    const bands = [
      [256, '#3f150d'],
      [236, '#5a2114'],
      [222, '#a07a5a'],
      [216, '#5a2114'],
      [176, '#6e2439'],
      [168, '#4d1a10'],
      [118, '#7c3018'],
      [70, '#4d1a10'],
      [30, '#94401f'],
    ] as const
    for (const [radius, colour] of bands) {
      ctx.fillStyle = colour
      ctx.beginPath()
      ctx.arc(256, 256, radius, 0, Math.PI * 2)
      ctx.fill()
    }
    // Pile: fine speckle so the bands don't read as flat paint.
    for (let i = 0; i < 9000; i++) {
      ctx.fillStyle = i % 2 ? 'rgba(0,0,0,0.12)' : 'rgba(255,220,190,0.06)'
      ctx.fillRect((i * 73.37) % 512, (i * 191.71) % 512, 2, 2)
    }
  })
}

/** Dark floorboards. */
function floorTexture() {
  const texture = canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = '#2a1a12'
    ctx.fillRect(0, 0, 512, 512)
    for (let row = 0; row < 8; row++) {
      const y = row * 64
      ctx.fillStyle = row % 2 ? 'rgba(255,200,160,0.03)' : 'rgba(0,0,0,0.1)'
      ctx.fillRect(0, y, 512, 64)
      ctx.fillStyle = 'rgba(0,0,0,0.45)'
      ctx.fillRect(0, y, 512, 2)
      const joint = (row * 197) % 512
      ctx.fillRect(joint, y, 2, 64)
    }
  })
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.repeat.set(10, 10)
  return texture
}

/* ---------- The television ---------- */

const TV = { width: 2.5, height: 1.85, depth: 1.5, legs: 0.42 }
const CENTRE_Y = TV.legs + TV.height / 2
const FRONT_Z = TV.depth / 2
const SCREEN_X = -0.3
const SCREEN_SIZE = { width: 1.56, height: 1.17 }
const CONTROLS_X = 0.82
const LEGS = [
  [-1.05, -0.55],
  [1.05, -0.55],
  [-1.05, 0.55],
  [1.05, 0.55],
] as const

/** A plane that bows outward in the middle, like the glass of a picture tube. */
function tubeGlass(width: number, height: number, depth: number) {
  const geometry = new PlaneGeometry(width, height, 32, 24)
  const position = geometry.attributes.position
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i) / (width / 2)
    const y = position.getY(i) / (height / 2)
    position.setZ(i, depth * (1 - 0.5 * x * x) * (1 - 0.5 * y * y))
  }
  geometry.computeVertexNormals()
  return geometry
}

function roundedRect(path: Shape | Path, width: number, height: number, radius: number) {
  const x = -width / 2
  const y = -height / 2
  path.moveTo(x + radius, y)
  path.lineTo(x + width - radius, y)
  path.quadraticCurveTo(x + width, y, x + width, y + radius)
  path.lineTo(x + width, y + height - radius)
  path.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  path.lineTo(x + radius, y + height)
  path.quadraticCurveTo(x, y + height, x, y + height - radius)
  path.lineTo(x, y + radius)
  path.quadraticCurveTo(x, y, x + radius, y)
}

/** The moulded surround of the screen: a rounded-rectangle ring. */
function screenSurround() {
  const outer = new Shape()
  roundedRect(outer, SCREEN_SIZE.width + 0.18, SCREEN_SIZE.height + 0.18, 0.16)
  const hole = new Path()
  roundedRect(hole, SCREEN_SIZE.width - 0.05, SCREEN_SIZE.height - 0.05, 0.13)
  outer.holes.push(hole)
  return new ExtrudeGeometry(outer, {
    depth: 0.05,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 3,
    curveSegments: 10,
  })
}

function canvasTexture(width: number, height: number, paint: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (ctx) paint(ctx)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

/** Walnut veneer: warm brown with wavy grain lines. */
function woodTexture() {
  const texture = canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = '#6e4027'
    ctx.fillRect(0, 0, 512, 512)
    for (let i = 0; i < 180; i++) {
      const y = (i * 37.3) % 512
      ctx.strokeStyle = i % 3 ? `rgba(40,20,10,${0.08 + (i % 5) * 0.03})` : `rgba(160,100,62,${0.1 + (i % 4) * 0.03})`
      ctx.lineWidth = 1 + (i % 4)
      ctx.beginPath()
      for (let x = 0; x <= 512; x += 16) {
        const wave = y + Math.sin(x * 0.012 + i) * 6 + Math.sin(x * 0.05 + i * 0.3) * 1.5
        if (x === 0) ctx.moveTo(x, wave)
        else ctx.lineTo(x, wave)
      }
      ctx.stroke()
    }
  })
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.repeat.set(1.4, 1)
  return texture
}

/** The maker's plate under the controls. */
function badgeTexture() {
  return canvasTexture(256, 64, (ctx) => {
    ctx.fillStyle = '#141010'
    ctx.fillRect(0, 0, 256, 64)
    ctx.strokeStyle = '#b8955e'
    ctx.lineWidth = 3
    ctx.strokeRect(4, 4, 248, 56)
    ctx.fillStyle = '#d9b27a'
    ctx.font = '700 38px Kalam, "Marker Felt", cursive'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('CASA', 128, 36)
  })
}

/** Drives the picture: draws the current channel into a canvas and runs the CRT shader. */
function useScreen(channel: number, data: TvData, reducedMotion: boolean) {
  const invalidate = useThree((state) => state.invalidate)
  const material = useRef<ShaderMaterial>(null)
  const light = useRef<string>(CHANNELS[channel].light)
  const [surface] = useState(() => {
    const canvas = document.createElement('canvas')
    canvas.width = SCREEN.width
    canvas.height = SCREEN.height
    const texture = new CanvasTexture(canvas)
    // Mipmaps keep small type from shimmering when the set is far away.
    texture.minFilter = LinearMipmapLinearFilter
    texture.anisotropy = 4
    return { canvas, texture }
  })
  const [uniforms] = useState(() => ({
    uContent: { value: surface.texture },
    uTime: { value: 0 },
    uStatic: { value: 0 },
    uPower: { value: 0 },
  }))
  const [assets, setAssets] = useState<TvAssets | null>(null)
  const view = useRef({ shown: channel, pending: channel, switchedAt: -Infinity, osdUntil: 0, lastDraw: 0, clock: 0 })

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
  useEffect(() => () => surface.texture.dispose(), [surface])

  // A new channel: a burst of static, then the picture changes and the channel number shows in the corner.
  useEffect(() => {
    const state = view.current
    if (state.pending === channel) return
    state.pending = channel
    state.switchedAt = performance.now()
    state.osdUntil = performance.now() + 2600
    invalidate()
  }, [channel, invalidate])

  // Rendering on demand (reduced motion) still needs the countdown and channel number to tick.
  useEffect(() => {
    if (!reducedMotion) return
    const id = window.setInterval(invalidate, 1000)
    return () => window.clearInterval(id)
  }, [reducedMotion, invalidate])

  useFrame((_, rawDelta) => {
    const u = material.current?.uniforms
    if (!u) return
    const delta = Math.min(rawDelta, 0.1)
    const state = view.current
    const now = performance.now()
    if (!reducedMotion) state.clock += delta
    u.uTime.value = state.clock
    u.uPower.value = reducedMotion ? 1 : Math.min(1, u.uPower.value + delta * 1.3)

    const since = now - state.switchedAt
    u.uStatic.value = reducedMotion ? 0 : since < 110 ? since / 110 : since < 430 ? 1 - (since - 110) / 320 : 0
    if (state.shown !== state.pending && (reducedMotion || since >= 110)) {
      state.shown = state.pending
      light.current = CHANNELS[state.shown].light
      state.lastDraw = 0
    }

    // Redraw at about 30 frames a second; the rolling credits and spinning record need it.
    if (assets && now - state.lastDraw > 33) {
      const ctx = surface.canvas.getContext('2d')
      if (ctx) {
        const osd = MathUtils.clamp((state.osdUntil - now) / 400, 0, 1)
        drawChannel(ctx, state.shown, data, state.clock, Date.now(), assets, osd)
        ;(u.uContent.value as CanvasTexture).needsUpdate = true
        state.lastDraw = now
      }
    }
  })

  return { material, uniforms, light }
}

function Television({ channel, data, reducedMotion, onNext }: RoomCanvasProps) {
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)
  const { material, uniforms, light } = useScreen(channel, data, reducedMotion)
  const glass = useMemo(() => tubeGlass(SCREEN_SIZE.width, SCREEN_SIZE.height, 0.07), [])
  const surround = useMemo(() => screenSurround(), [])
  const wood = useMemo(() => woodTexture(), [])
  const badge = useMemo(() => badgeTexture(), [])
  const knob = useRef<Mesh>(null)
  const screenLight = useRef<PointLight>(null)
  const lightColour = useRef(new Color(CHANNELS[channel].light))

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1)
    // The channel knob turns to each channel's position.
    if (knob.current) {
      const target = -channel * ((Math.PI * 2) / CHANNELS.length)
      knob.current.rotation.y = reducedMotion ? target : MathUtils.damp(knob.current.rotation.y, target, 7, delta)
    }
    // The picture lights the room in its own colour.
    if (screenLight.current) {
      lightColour.current.set(light.current)
      screenLight.current.color.lerp(lightColour.current, reducedMotion ? 1 : 1 - Math.exp(-4 * delta))
    }
  })

  return (
    <group
      onClick={(event) => {
        event.stopPropagation()
        onNext()
      }}
      onPointerOver={(event) => {
        event.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
    >
      {LEGS.map(([x, z]) => (
        <mesh key={`${x}:${z}`} position={[x, TV.legs / 2, z]} rotation={[z > 0 ? 0.08 : -0.08, 0, x > 0 ? -0.08 : 0.08]} castShadow>
          <cylinderGeometry args={[0.028, 0.045, TV.legs + 0.04, 12]} />
          <meshStandardMaterial color="#8c6a3c" metalness={0.6} roughness={0.35} />
        </mesh>
      ))}

      <RoundedBox args={[TV.width, TV.height, TV.depth]} radius={0.1} smoothness={4} position={[0, CENTRE_Y, 0]} castShadow receiveShadow>
        <meshStandardMaterial map={wood} color="#b98460" roughness={0.5} />
      </RoundedBox>

      <mesh position={[0, CENTRE_Y, FRONT_Z + 0.002]}>
        <planeGeometry args={[TV.width - 0.2, TV.height - 0.2]} />
        <meshStandardMaterial color="#1a1310" roughness={0.55} />
      </mesh>

      <mesh geometry={surround} position={[SCREEN_X, CENTRE_Y, FRONT_Z - 0.02]}>
        <meshStandardMaterial color="#0f0c0b" metalness={0.35} roughness={0.35} />
      </mesh>
      <mesh geometry={glass} position={[SCREEN_X, CENTRE_Y, FRONT_Z + 0.004]}>
        <shaderMaterial ref={material} vertexShader={screenVertex} fragmentShader={screenFragment} uniforms={uniforms} toneMapped={false} />
      </mesh>

      {/* Channel knob, which turns with the channel, and the volume knob. */}
      <group position={[CONTROLS_X, CENTRE_Y + 0.46, FRONT_Z + 0.04]} rotation-x={Math.PI / 2}>
        <mesh ref={knob} castShadow>
          <cylinderGeometry args={[0.14, 0.155, 0.09, 32]} />
          <meshStandardMaterial color="#2a201a" roughness={0.35} metalness={0.2} />
          <mesh position={[0, 0.047, 0.08]}>
            <boxGeometry args={[0.024, 0.006, 0.08]} />
            <meshStandardMaterial color={palette.cream} />
          </mesh>
        </mesh>
      </group>
      <group position={[CONTROLS_X, CENTRE_Y + 0.12, FRONT_Z + 0.035]} rotation-x={Math.PI / 2}>
        <mesh castShadow>
          <cylinderGeometry args={[0.095, 0.105, 0.07, 28]} />
          <meshStandardMaterial color="#2a201a" roughness={0.35} metalness={0.2} />
        </mesh>
      </group>

      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={i} position={[CONTROLS_X, CENTRE_Y - 0.2 - i * 0.068, FRONT_Z + 0.012]}>
          <boxGeometry args={[0.44, 0.026, 0.02]} />
          <meshStandardMaterial color="#3d2b1f" roughness={0.6} />
        </mesh>
      ))}

      <mesh position={[CONTROLS_X, CENTRE_Y - 0.72, FRONT_Z + 0.006]}>
        <planeGeometry args={[0.4, 0.1]} />
        <meshStandardMaterial map={badge} roughness={0.4} metalness={0.4} />
      </mesh>
      <mesh position={[CONTROLS_X + 0.24, CENTRE_Y - 0.72, FRONT_Z + 0.012]}>
        <sphereGeometry args={[0.018, 12, 12]} />
        <meshBasicMaterial color="#ff4a2a" toneMapped={false} />
      </mesh>

      <TableLamp position={[-0.78, TV.legs + TV.height, 0.05]} reducedMotion={reducedMotion} />

      {/* Rabbit-ear antenna. */}
      <group position={[0.4, TV.legs + TV.height, -0.25]}>
        <mesh castShadow>
          <sphereGeometry args={[0.12, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#1c1512" roughness={0.4} metalness={0.4} />
        </mesh>
        {[-1, 1].map((side) => (
          <group key={side} rotation-z={side * 0.56}>
            <mesh position={[0, 0.5, 0]} castShadow>
              <cylinderGeometry args={[0.01, 0.012, 0.96, 8]} />
              <meshStandardMaterial color="#b9b2a8" metalness={0.9} roughness={0.25} />
            </mesh>
            <mesh position={[0, 0.98, 0]}>
              <sphereGeometry args={[0.026, 10, 10]} />
              <meshStandardMaterial color="#b9b2a8" metalness={0.9} roughness={0.25} />
            </mesh>
          </group>
        ))}
      </group>

      <pointLight
        ref={screenLight}
        position={[SCREEN_X, CENTRE_Y, FRONT_Z + 0.9]}
        intensity={hovered ? 3.4 : 2.6}
        distance={7}
        decay={1.6}
      />
    </group>
  )
}

/* ---------- Lamp, plant and records ---------- */

type PropsWithMotion = ThreeElements['group'] & { reducedMotion: boolean }

/** How bright the room's lamps are: a slow breath, never a flash. Shared with the wordmark wall's rhythm. */
function breath(time: number) {
  const wave = 0.5 + 0.5 * Math.sin(time * 0.62)
  return 0.55 + 0.45 * wave * wave
}

function glowTexture() {
  return canvasTexture(128, 128, (ctx) => {
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(0.35, 'rgba(255,255,255,0.35)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 128, 128)
  })
}

/** Linen shade lit from inside: brightest at the lower rim, with the weave showing. */
function shadeTexture() {
  return canvasTexture(256, 256, (ctx) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 256)
    gradient.addColorStop(0, '#8a4a22')
    gradient.addColorStop(0.55, '#e59a5c')
    gradient.addColorStop(1, '#ffd9a8')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 256, 256)
    for (let x = 0; x < 256; x += 3) {
      ctx.fillStyle = `rgba(90,40,15,${0.05 + ((x * 7) % 5) * 0.012})`
      ctx.fillRect(x, 0, 1, 256)
    }
  })
}

function FloorLamp({ reducedMotion, aim, ...props }: PropsWithMotion & { aim: number }) {
  const spot = useRef<SpotLight>(null)
  const fill = useRef<PointLight>(null)
  const shade = useRef<MeshStandardMaterial>(null)
  const glow = useRef<SpriteMaterial>(null)
  const [target] = useState(() => new Object3D())
  const halo = useMemo(() => glowTexture(), [])
  const linen = useMemo(() => shadeTexture(), [])

  useFrame(({ clock }) => {
    const level = breath(reducedMotion ? 2 : clock.elapsedTime)
    if (spot.current) spot.current.intensity = 38 * level
    if (fill.current) fill.current.intensity = 6 * level
    if (shade.current) shade.current.emissiveIntensity = 0.45 + 0.75 * level
    if (glow.current) glow.current.opacity = 0.2 + 0.3 * level
  })

  return (
    <group {...props}>
      <mesh position={[0, 0.03, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.3, 0.34, 0.06, 32]} />
        <meshStandardMaterial color="#1b1411" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.05, 0]} castShadow>
        <cylinderGeometry args={[0.022, 0.022, 2, 12]} />
        <meshStandardMaterial color="#8c6a3c" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 2.18, 0]}>
        <cylinderGeometry args={[0.28, 0.46, 0.52, 40, 1, true]} />
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
      <mesh position={[0, 2.06, 0]}>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshBasicMaterial color="#ffe0b8" toneMapped={false} />
      </mesh>
      <primitive object={target} position={[aim, 0, 1.2]} />
      <spotLight
        ref={spot}
        position={[0, 2.02, 0]}
        target={target}
        angle={0.95}
        penumbra={0.85}
        color="#ffa257"
        intensity={40}
        distance={11}
        decay={1.8}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
      />
      <pointLight ref={fill} position={[0, 2.3, 0.1]} color="#ff9447" intensity={5} distance={8} decay={1.8} />
      <sprite position={[0, 2.12, 0.05]} scale={[2.6, 2.6, 1]}>
        <spriteMaterial ref={glow} map={halo} color="#ff9a4d" blending={AdditiveBlending} transparent depthWrite={false} opacity={0.45} />
      </sprite>
    </group>
  )
}

/** A little mushroom lamp on top of the set, breathing out of step with the floor lamp. */
function TableLamp({ reducedMotion, ...props }: PropsWithMotion) {
  const bulb = useRef<PointLight>(null)
  const dome = useRef<MeshStandardMaterial>(null)

  useFrame(({ clock }) => {
    const level = breath((reducedMotion ? 2 : clock.elapsedTime) + 3.4)
    if (bulb.current) bulb.current.intensity = 4.5 * level
    if (dome.current) dome.current.emissiveIntensity = 0.6 + 1.1 * level
  })

  return (
    <group {...props}>
      <mesh position={[0, 0.02, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.15, 0.04, 24]} />
        <meshStandardMaterial color="#2a1d15" roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.17, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.05, 0.28, 16]} />
        <meshStandardMaterial color="#e8d6bd" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.3, 0]}>
        <sphereGeometry args={[0.22, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial ref={dome} color="#f3c28a" emissive="#ff9a4d" emissiveIntensity={1.2} side={DoubleSide} roughness={0.8} />
      </mesh>
      <pointLight ref={bulb} position={[0, 0.26, 0.05]} color="#ffa257" intensity={4} distance={5} decay={1.6} />
    </group>
  )
}

/** One leaf: a pointed oval arched along its length and folded at the midrib. */
function leafGeometry() {
  const shape = new Shape()
  shape.moveTo(0, 0)
  shape.bezierCurveTo(0.2, 0.12, 0.24, 0.46, 0, 0.78)
  shape.bezierCurveTo(-0.24, 0.46, -0.2, 0.12, 0, 0)
  const geometry = new ShapeGeometry(shape, 16)
  const position = geometry.attributes.position
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i)
    const y = position.getY(i)
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
      scale: 0.75 + (1 - t) * 0.45 + random() * 0.15,
      shade: (random() - 0.5) * 0.08,
    }
  })
}

function Plant({ reducedMotion, ...props }: PropsWithMotion) {
  const crown = useRef<Group>(null)
  const leaves = useRef<InstancedMesh>(null)
  const geometry = useMemo(() => leafGeometry(), [])
  const layout = useMemo(() => leafLayout(18), [])

  useLayoutEffect(() => {
    const mesh = leaves.current
    if (!mesh) return
    const dummy = new Object3D()
    const colour = new Color()
    layout.forEach((leaf, i) => {
      dummy.position.set(...leaf.position)
      dummy.rotation.set(leaf.tilt, leaf.turn, 0, 'YXZ')
      dummy.scale.setScalar(leaf.scale)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      mesh.setColorAt(i, colour.set(palette.green).offsetHSL(0, 0, leaf.shade))
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
        <cylinderGeometry args={[0.34, 0.26, 0.62, 28]} />
        <meshStandardMaterial color="#9a5132" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.37, 0.35, 0.08, 28]} />
        <meshStandardMaterial color="#a55a38" roughness={0.9} />
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
          <meshStandardMaterial side={DoubleSide} roughness={0.7} />
        </instancedMesh>
      </group>
    </group>
  )
}

// Hung clear of the section title in the top left. Tall screens bunch them over the set.
const RECORDS = [
  { wide: [-0.75, 3.6, -2.3], tall: [-0.85, 3.95, -2.4], label: palette.orange, phase: 0 },
  { wide: [1.6, 3.3, -1.9], tall: [0.55, 4.25, -2.8], label: palette.pink, phase: 2.1 },
  { wide: [3.35, 3.75, -2.6], tall: [1.35, 3.7, -1.9], label: palette.red, phase: 4.2 },
] as const

function groovesTexture() {
  return canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = '#0c0c0d'
    ctx.fillRect(0, 0, 256, 256)
    for (let r = 40; r < 127; r += 2.5) {
      ctx.strokeStyle = `rgba(255,255,255,${0.025 + ((r * 7) % 5) * 0.01})`
      ctx.beginPath()
      ctx.arc(128, 128, r, 0, Math.PI * 2)
      ctx.stroke()
    }
  })
}

function HangingRecords({ portrait, reducedMotion }: { portrait: boolean; reducedMotion: boolean }) {
  const records = useRef<(Group | null)[]>([])
  const grooves = useMemo(() => groovesTexture(), [])

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
          <cylinderGeometry args={[0.5, 0.5, 0.012, 64]} />
          <meshPhysicalMaterial map={grooves} roughness={0.3} metalness={0.25} clearcoat={0.7} clearcoatRoughness={0.25} />
        </mesh>
        {[1, -1].map((side) => (
          <mesh key={side} position={[0, 0, side * 0.0068]} rotation-y={side < 0 ? Math.PI : 0}>
            <circleGeometry args={[0.17, 40]} />
            <meshStandardMaterial color={record.label} roughness={0.6} />
          </mesh>
        ))}
      </group>
    </group>
  ))
}
