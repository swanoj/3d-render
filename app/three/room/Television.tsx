import { RoundedBox, useCursor } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  CylinderGeometry,
  ExtrudeGeometry,
  HalfFloatType,
  LinearFilter,
  LinearMipmapLinearFilter,
  MathUtils,
  Path,
  PlaneGeometry,
  Shape,
  SRGBColorSpace,
  WebGLRenderTarget,
  type Mesh,
  type MeshBasicMaterial,
  type PerspectiveCamera,
  type PointLight,
  type ShaderMaterial,
} from 'three'
import { CHANNELS, drawChannel, SCREEN, type ChannelId, type TvAssets, type TvData } from '../channels'
import { screenFragment, screenVertex } from '../tv-screen.glsl'
import { TableLamp } from './Furniture'
import { CENTRE_Y, CONTROLS_X, FRONT_Z, SCREEN_SIZE, SCREEN_X, TABLE_LAMP, TOP_Y, TV } from './layout'
import {
  badgeTexture,
  dialTexture,
  fabricTexture,
  glowTexture,
  knurlTexture,
  screenGlowTexture,
  walnutTexture,
} from './textures'

// The halo of light around the picture: a plane this much larger than the screen.
const HALO = { width: SCREEN_SIZE.width + 0.95, height: SCREEN_SIZE.height + 0.85 }

/** Glow and halos never take clicks: they belong to the set, but the set's own parts should get them. */
const noRaycast = () => null

// How much each channel's picture lights the room (the credits are dark; the rules are cream paper).
const SCREEN_GLOW: Record<ChannelId, number> = { next: 1, lineup: 0.45, rules: 1.15, vinyl: 0.8, test: 1, cam: 0.6 }

const CAM = CHANNELS.findIndex((channel) => channel.id === 'cam')

// Casa Cam's picture: small and a little choppy, like a real security camera's.
const FEED = { width: 320, height: 240, interval: 1000 / 15 }

// Where the volume knob points: low at seven o'clock, and turned up to two o'clock while the sound is on.
const VOLUME = { off: -0.52, on: -4.19 }

const LEGS = [
  [-1.02, -0.2],
  [1.02, -0.2],
  [-1.02, 0.6],
  [1.02, 0.6],
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

/** A rounded-rectangle ring around the screen, grown (or shrunk) from the screen size by `outer` and `inner`. */
function frame(outer: number, inner: number, outerRadius: number, innerRadius: number, depth: number) {
  const shape = new Shape()
  roundedRect(shape, SCREEN_SIZE.width + outer, SCREEN_SIZE.height + outer, outerRadius)
  const hole = new Path()
  roundedRect(hole, SCREEN_SIZE.width + inner, SCREEN_SIZE.height + inner, innerRadius)
  shape.holes.push(hole)
  return new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 3,
    curveSegments: 12,
  })
}

/** The tube's housing behind the cabinet: a flat-sided taper, narrow end to the back. */
function housing() {
  const geometry = new CylinderGeometry(0.62, 1.02, 0.8, 4, 1).toNonIndexed()
  geometry.rotateY(Math.PI / 4)
  geometry.rotateX(-Math.PI / 2)
  geometry.scale(1.4, 1.02, 1)
  geometry.computeVertexNormals()
  return geometry
}

/**
 * Draws the current channel into a canvas each frame and runs it through the CRT shader. On Casa Cam it also films
 * the room from the security camera `cctv`.
 */
function useScreen(
  channel: number,
  data: TvData,
  assets: TvAssets | null,
  reducedMotion: boolean,
  cctv: RefObject<PerspectiveCamera | null>,
) {
  const invalidate = useThree((state) => state.invalidate)
  const material = useRef<ShaderMaterial>(null)
  const shown = useRef<number>(channel)
  const [surface] = useState(() => {
    const canvas = document.createElement('canvas')
    canvas.width = SCREEN.width
    canvas.height = SCREEN.height
    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    // Mipmaps keep small type from shimmering when the set is further away.
    texture.minFilter = LinearMipmapLinearFilter
    texture.anisotropy = 4
    return { canvas, texture }
  })
  // Two pictures: the camera films into one while the screen shows the other.
  const [feeds] = useState(() =>
    [0, 1].map(
      () =>
        new WebGLRenderTarget(FEED.width, FEED.height, {
          type: HalfFloatType,
          minFilter: LinearFilter,
          magFilter: LinearFilter,
        }),
    ),
  )
  const [uniforms] = useState(() => ({
    uContent: { value: surface.texture },
    uTime: { value: 0 },
    uStatic: { value: 0 },
    uPower: { value: 0 },
    uBoost: { value: 1.1 },
    uCam: { value: feeds[0].texture },
    uCamMix: { value: 0 },
  }))
  const view = useRef({
    pending: channel,
    switchedAt: -Infinity,
    osdUntil: 0,
    lastDraw: 0,
    clock: 0,
    failed: false,
    feed: 0,
    filmedAt: -Infinity,
  })

  useEffect(() => () => surface.texture.dispose(), [surface])
  useEffect(() => () => feeds.forEach((feed) => feed.dispose()), [feeds])

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

  useFrame(({ gl, scene }, rawDelta) => {
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
    if (shown.current !== state.pending && (reducedMotion || since >= 110)) {
      shown.current = state.pending
      state.lastDraw = 0
    }
    u.uCamMix.value = shown.current === CAM ? 1 : 0

    // Casa Cam films the room into one picture while the screen shows the other, then they swap. The set is in its
    // own shot, so the screen shows a tunnel of itself, a frame deeper each time round. It starts filming during
    // the static so the first picture is ready.
    const camera = cctv.current
    const filming = shown.current === CAM || state.pending === CAM
    if (filming && camera && now - state.filmedAt >= (reducedMotion ? 0 : FEED.interval)) {
      const into = feeds[1 - state.feed]
      u.uCam.value = feeds[state.feed].texture
      const target = gl.getRenderTarget()
      const shadows = gl.shadowMap.autoUpdate
      // The lamps' shadows from the last frame will do; they barely move.
      gl.shadowMap.autoUpdate = false
      gl.setRenderTarget(into)
      gl.clear()
      gl.render(scene, camera)
      gl.setRenderTarget(target)
      gl.shadowMap.autoUpdate = shadows
      u.uCam.value = into.texture
      state.feed = 1 - state.feed
      state.filmedAt = now
    }

    // Redraw at about 30 frames a second; the rolling credits and spinning record need it.
    if (assets && now - state.lastDraw > 33) {
      const ctx = surface.canvas.getContext('2d')
      if (ctx) {
        const osd = MathUtils.clamp((state.osdUntil - now) / 400, 0, 1)
        // A drawing error must never stop the render loop: the room keeps running with the last good picture.
        try {
          drawChannel(ctx, shown.current, data, state.clock, Date.now() + data.offset, assets, osd, true)
          ;(u.uContent.value as CanvasTexture).needsUpdate = true
        } catch (error) {
          if (!state.failed) console.warn('Casa TV could not draw a channel.', error)
          state.failed = true
        }
        state.lastDraw = now
      }
    }
  })

  return { material, uniforms, shown }
}

interface TelevisionProps {
  channel: number
  data: TvData
  assets: TvAssets | null
  reducedMotion: boolean
  onNext: () => void
  /** Whether the room's sound is on; the volume knob turns up with it, and clicking the knob toggles it. */
  sound: boolean
  onSound: () => void
  /** The little lamp on top of the set, and its switch. */
  lamp: boolean
  onLamp: () => void
  /** The security camera Casa Cam films from. */
  cctv: RefObject<PerspectiveCamera | null>
}

/** A walnut console set: tube housing, chrome-trimmed screen, channel dial, cloth speaker and brass legs. */
export function Television({
  channel,
  data,
  assets,
  reducedMotion,
  onNext,
  sound,
  onSound,
  lamp,
  onLamp,
  cctv,
}: TelevisionProps) {
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)
  const { material, uniforms, shown } = useScreen(channel, data, assets, reducedMotion, cctv)
  const shapes = useMemo(
    () => ({
      glass: tubeGlass(SCREEN_SIZE.width, SCREEN_SIZE.height, 0.07),
      surround: frame(0.18, -0.05, 0.16, 0.13, 0.05),
      trim: frame(0.27, 0.17, 0.2, 0.16, 0.02),
      housing: housing(),
    }),
    [],
  )
  const textures = useMemo(
    () => ({
      wood: walnutTexture(),
      fabric: fabricTexture(),
      knurl: knurlTexture(),
      halo: screenGlowTexture(HALO.width, HALO.height, SCREEN_SIZE.width, SCREEN_SIZE.height),
      glow: glowTexture(),
    }),
    [],
  )
  const halo = useRef<MeshBasicMaterial>(null)
  // Lettered textures wait for the brand fonts, which load with the channel artwork.
  const lettering = useMemo(() => (assets ? { dial: dialTexture(CHANNELS.length), badge: badgeTexture() } : null), [assets])
  const knob = useRef<Mesh>(null)
  const volume = useRef<Mesh>(null)
  const screenLight = useRef<PointLight>(null)
  const lightColour = useRef(new Color(CHANNELS[channel].light))

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1)
    // The channel knob turns to point at each channel's number on the dial.
    if (knob.current) {
      const target = Math.PI - channel * ((Math.PI * 2) / CHANNELS.length)
      knob.current.rotation.y = reducedMotion ? target : MathUtils.damp(knob.current.rotation.y, target, 7, delta)
    }
    if (volume.current) {
      const target = sound ? VOLUME.on : VOLUME.off
      volume.current.rotation.y = reducedMotion ? target : MathUtils.damp(volume.current.rotation.y, target, 5, delta)
    }
    // The picture lights the room in its own colour and brightness.
    const light = screenLight.current
    if (light) {
      const current = CHANNELS[shown.current]
      lightColour.current.set(current.light)
      const ease = reducedMotion ? 1 : 1 - Math.exp(-4 * delta)
      light.color.lerp(lightColour.current, ease)
      const goal = 2.4 * SCREEN_GLOW[current.id] * (hovered ? 1.25 : 1)
      light.intensity = MathUtils.lerp(light.intensity, goal, ease)
      // The picture's glow spills over the surround in the same colour: the bloom, without a bloom pass.
      if (halo.current) {
        halo.current.color.copy(light.color)
        halo.current.opacity = MathUtils.lerp(halo.current.opacity, 0.55 * SCREEN_GLOW[current.id], ease)
      }
    }
  })

  const brass = <meshStandardMaterial color="#c9a46a" metalness={1} roughness={0.3} />
  const chrome = <meshStandardMaterial color="#ddd3c2" metalness={1} roughness={0.18} />

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
        <group key={`${x}:${z}`} position={[x, TV.legs, z]} rotation={[z > 0 ? 0.1 : -0.1, 0, x > 0 ? -0.1 : 0.1]}>
          <mesh position={[0, -TV.legs / 2, 0]} castShadow>
            <cylinderGeometry args={[0.045, 0.026, TV.legs + 0.02, 16]} />
            <meshPhysicalMaterial map={textures.wood} color="#9a6440" roughness={0.45} clearcoat={0.5} />
          </mesh>
          <mesh position={[0, -TV.legs + 0.035, 0]} castShadow>
            <cylinderGeometry args={[0.028, 0.024, 0.07, 16]} />
            {brass}
          </mesh>
        </group>
      ))}

      {/* Cabinet, and the tube's housing behind it. */}
      <RoundedBox
        args={[TV.width, TV.height, TV.depth]}
        radius={0.1}
        smoothness={4}
        position={[0, CENTRE_Y, FRONT_Z - TV.depth / 2]}
        castShadow
        receiveShadow
      >
        <meshPhysicalMaterial
          map={textures.wood}
          bumpMap={textures.wood}
          bumpScale={0.5}
          color="#c38d63"
          roughness={0.5}
          clearcoat={0.65}
          clearcoatRoughness={0.26}
        />
      </RoundedBox>
      <mesh geometry={shapes.housing} position={[0, CENTRE_Y, FRONT_Z - TV.depth - 0.4]} castShadow receiveShadow>
        <meshStandardMaterial color="#231710" roughness={0.55} metalness={0.1} />
      </mesh>

      {/* Front panel. */}
      <RoundedBox
        args={[TV.width - 0.17, TV.height - 0.17, 0.04]}
        radius={0.05}
        smoothness={3}
        position={[0, CENTRE_Y, FRONT_Z + 0.005]}
        receiveShadow
      >
        <meshStandardMaterial color="#1a120e" roughness={0.42} metalness={0.1} />
      </RoundedBox>

      {/* Screen: chrome trim, moulded surround, the picture and the glass in front of it. */}
      <mesh geometry={shapes.trim} position={[SCREEN_X, CENTRE_Y, FRONT_Z + 0.012]}>
        {chrome}
      </mesh>
      <mesh geometry={shapes.surround} position={[SCREEN_X, CENTRE_Y, FRONT_Z + 0.02]} receiveShadow>
        <meshStandardMaterial color="#0e0b0a" metalness={0.3} roughness={0.3} />
      </mesh>
      <mesh geometry={shapes.glass} position={[SCREEN_X, CENTRE_Y, FRONT_Z + 0.03]}>
        <shaderMaterial
          ref={material}
          vertexShader={screenVertex}
          fragmentShader={screenFragment}
          uniforms={uniforms}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[SCREEN_X, CENTRE_Y, FRONT_Z + 0.05]} raycast={noRaycast}>
        <planeGeometry args={[HALO.width, HALO.height]} />
        <meshBasicMaterial
          ref={halo}
          map={textures.halo}
          opacity={0}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
      {/* Reflections only: added over the picture so the glass catches the lamps without dimming it. */}
      <mesh geometry={shapes.glass} position={[SCREEN_X, CENTRE_Y, FRONT_Z + 0.042]}>
        <meshPhysicalMaterial
          color="#000000"
          roughness={0.05}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.04}
          envMapIntensity={1.6}
          blending={AdditiveBlending}
          transparent
          depthWrite={false}
        />
      </mesh>

      {/* Channel dial and knob, which turns with the channel, then the volume knob. */}
      {lettering && (
        <mesh position={[CONTROLS_X, CENTRE_Y + 0.46, FRONT_Z + 0.028]}>
          <circleGeometry args={[0.25, 48]} />
          <meshStandardMaterial map={lettering.dial} roughness={0.45} metalness={0.2} />
        </mesh>
      )}
      <group position={[CONTROLS_X, CENTRE_Y + 0.46, FRONT_Z + 0.075]} rotation-x={Math.PI / 2}>
        <mesh ref={knob} castShadow>
          <cylinderGeometry args={[0.13, 0.14, 0.09, 48]} />
          <meshStandardMaterial
            attach="material-0"
            color="#2c211a"
            roughness={0.35}
            metalness={0.25}
            bumpMap={textures.knurl}
            bumpScale={2}
          />
          <meshStandardMaterial attach="material-1" color="#ddd3c2" metalness={1} roughness={0.2} />
          <meshStandardMaterial attach="material-2" color="#2c211a" roughness={0.4} />
          <mesh position={[0, 0.047, 0.085]}>
            <boxGeometry args={[0.022, 0.006, 0.07]} />
            <meshStandardMaterial color="#ede1d3" roughness={0.4} />
          </mesh>
        </mesh>
      </group>
      {/* The volume knob works: it turns the room's sound on and off. */}
      <group
        position={[CONTROLS_X, CENTRE_Y + 0.1, FRONT_Z + 0.06]}
        rotation-x={Math.PI / 2}
        onClick={(event) => {
          event.stopPropagation()
          onSound()
        }}
      >
        <mesh ref={volume} rotation-y={VOLUME.off} castShadow>
          <cylinderGeometry args={[0.09, 0.1, 0.07, 40]} />
          <meshStandardMaterial
            attach="material-0"
            color="#2c211a"
            roughness={0.35}
            metalness={0.25}
            bumpMap={textures.knurl}
            bumpScale={2}
          />
          <meshStandardMaterial attach="material-1" color="#ddd3c2" metalness={1} roughness={0.2} />
          <meshStandardMaterial attach="material-2" color="#2c211a" roughness={0.4} />
          <mesh position={[0, 0.036, 0.058]}>
            <boxGeometry args={[0.016, 0.005, 0.05]} />
            <meshStandardMaterial color="#ede1d3" roughness={0.4} />
          </mesh>
        </mesh>
      </group>

      {/* Speaker cloth in a brass frame. */}
      <mesh position={[CONTROLS_X, CENTRE_Y - 0.36, FRONT_Z + 0.027]}>
        <planeGeometry args={[0.44, 0.5]} />
        <meshStandardMaterial map={textures.fabric} roughness={0.95} />
      </mesh>
      {[
        [0, 0.26, 0.47, 0.018],
        [0, -0.26, 0.47, 0.018],
        [-0.23, 0, 0.018, 0.54],
        [0.23, 0, 0.018, 0.54],
      ].map(([x, y, w, h]) => (
        <mesh key={`${x}:${y}`} position={[CONTROLS_X + x, CENTRE_Y - 0.36 + y, FRONT_Z + 0.032]}>
          <boxGeometry args={[w, h, 0.012]} />
          {brass}
        </mesh>
      ))}

      {lettering && (
        <mesh position={[CONTROLS_X - 0.03, CENTRE_Y - 0.74, FRONT_Z + 0.028]}>
          <planeGeometry args={[0.34, 0.085]} />
          <meshStandardMaterial map={lettering.badge} metalness={0.8} roughness={0.35} />
        </mesh>
      )}
      <mesh position={[CONTROLS_X + 0.19, CENTRE_Y - 0.74, FRONT_Z + 0.034]}>
        <sphereGeometry args={[0.016, 12, 12]} />
        <meshBasicMaterial color={[5, 0.6, 0.25]} toneMapped={false} />
      </mesh>
      <sprite position={[CONTROLS_X + 0.19, CENTRE_Y - 0.74, FRONT_Z + 0.05]} scale={0.16} raycast={noRaycast}>
        <spriteMaterial map={textures.glow} color="#ff4a2a" opacity={0.7} transparent depthWrite={false} blending={AdditiveBlending} />
      </sprite>

      <TableLamp position={TABLE_LAMP} reducedMotion={reducedMotion} on={lamp} onToggle={onLamp} />

      {/* Rabbit ears: telescopic chrome rods. */}
      <group position={[0.45, TOP_Y, -0.15]}>
        <mesh castShadow>
          <sphereGeometry args={[0.11, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#1c1512" roughness={0.35} metalness={0.4} />
        </mesh>
        {[-1, 1].map((side) => (
          <group key={side} rotation-z={side * 0.52} rotation-x={-0.1}>
            {[0.012, 0.009, 0.0065].map((radius, i) => (
              <mesh key={radius} position={[0, 0.2 + i * 0.3, 0]} castShadow>
                <cylinderGeometry args={[radius, radius, 0.36, 10]} />
                {chrome}
              </mesh>
            ))}
            <mesh position={[0, 0.96, 0]}>
              <sphereGeometry args={[0.022, 12, 12]} />
              {chrome}
            </mesh>
          </group>
        ))}
      </group>

      {/* Just behind the glass, so it lights the room without a hotspot reflecting in the screen. */}
      <pointLight ref={screenLight} position={[SCREEN_X, CENTRE_Y, FRONT_Z - 0.1]} intensity={2.4} distance={7} decay={1.6} />
    </group>
  )
}
