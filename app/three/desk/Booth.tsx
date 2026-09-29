import { Environment, Lightformer, RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, MathUtils, MeshPhysicalMaterial, type MeshBasicMaterial, type PointLight } from 'three'
import { palette } from '../../brand/brand'
import type { TvAssets } from '../channels'
import { canvasTexture, walnutTexture, wallpaperTexture } from '../room/textures'
import { seconds } from './layout'
import { neonGlowTexture, neonTubeTexture } from './textures'

const DESK = { length: 3.6, depth: 0.95, thickness: 0.045, z: 0.05 }
const WALL_Z = -0.62

/**
 * The booth's light: a warm key light from above the dancefloor with soft shadows, a cool rim from the side, and
 * an environment of softboxes and the neon sign for the vinyl, chrome and lacquer to reflect. No post-processing.
 */
export function BoothLights() {
  return (
    <>
      <Environment resolution={256} frames={1}>
        <color attach="background" args={['#2a2828']} />
        <Lightformer form="rect" intensity={2} color="#fff0e0" position={[0, 2.2, 0.8]} scale={[3.5, 1.2, 1]} />
        <Lightformer form="rect" intensity={1.4} color="#ff6a2a" position={[0, 0.3, -1]} scale={[1.6, 0.3, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#a8bfff" position={[2.4, 0.7, -0.3]} scale={[0.4, 1.6, 1]} />
        <Lightformer form="rect" intensity={0.7} color="#ffd9b8" position={[0, 0.5, 2.6]} scale={[4, 0.8, 1]} />
      </Environment>
      <hemisphereLight args={['#fff1e2', '#24170f', 0.38]} />
      <directionalLight
        position={[-0.9, 2.1, 1.7]}
        intensity={2.6}
        color="#fff2e6"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-1.8}
        shadow-camera-right={1.8}
        shadow-camera-top={1.3}
        shadow-camera-bottom={-1.3}
        shadow-camera-near={0.5}
        shadow-camera-far={5}
        shadow-bias={-0.0003}
        shadow-normalBias={0.012}
      />
      <directionalLight position={[1.6, 0.9, -1.2]} intensity={0.55} color="#9fb6ff" />
    </>
  )
}

/** A soft wash fading downwards, for the light an LED strip throws on the panel under it. */
function washTexture() {
  return canvasTexture(8, 128, (ctx) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 128)
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(0.25, 'rgba(255,255,255,0.35)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 8, 128)
  })
}

/** The desk: lacquered walnut on a dark front panel, with a Casa-orange LED strip under its lip. */
export function DeskTop({ centre }: { centre: number }) {
  const walnut = useMemo(() => {
    const map = walnutTexture()
    map.repeat.set(5, 1.3)
    return new MeshPhysicalMaterial({ map, roughness: 0.42, clearcoat: 0.65, clearcoatRoughness: 0.16 })
  }, [])
  const wash = useMemo(() => washTexture(), [])
  const { length, depth, thickness, z } = DESK
  const front = z + depth / 2
  return (
    <group position={[centre, 0, 0]}>
      <RoundedBox
        args={[length, thickness, depth]}
        radius={0.012}
        smoothness={4}
        position={[0, -thickness / 2, z]}
        material={walnut}
        receiveShadow
      />
      <mesh position={[0, -0.36, front - 0.03]} receiveShadow>
        <boxGeometry args={[length, 0.62, 0.02]} />
        <meshStandardMaterial color="#130f0d" roughness={0.75} />
      </mesh>
      <mesh position={[0, -thickness - 0.004, front - 0.02]}>
        <boxGeometry args={[length, 0.004, 0.004]} />
        <meshBasicMaterial color="#ff7a3a" toneMapped={false} />
      </mesh>
      <mesh position={[0, -thickness - 0.07, front - 0.018]}>
        <planeGeometry args={[length, 0.13]} />
        <meshBasicMaterial map={wash} color={palette.orange} transparent opacity={0.3} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  )
}

/**
 * The wall behind the booth, in the TV room's striped wallpaper, with CLUB CASA in orange neon that warms up as
 * the desk arrives.
 */
export function BackWall({
  centre,
  sign,
  assets,
}: {
  centre: number
  sign: { x: number; scale: number }
  assets: TvAssets | null
}) {
  const paper = useMemo(() => wallpaperTexture(14, 3), [])
  const neon = useMemo(() => (assets ? { tube: neonTubeTexture(assets), glow: neonGlowTexture(assets) } : null), [assets])
  const tube = useRef<MeshBasicMaterial>(null)
  const glow = useRef<MeshBasicMaterial>(null)
  const light = useRef<PointLight>(null)
  const born = useRef(-1)

  useFrame((state) => {
    if (born.current < 0 && neon) born.current = seconds()
    if (born.current < 0) return
    const t = seconds() - born.current
    // The tubes warm up with one soft dip as they strike, never a flash (the room never strobes).
    const striking = t < 1.3
    const level = striking
      ? MathUtils.smoothstep(t, 0.25, 1) * (1 - 0.4 * Math.exp(-(((t - 0.58) / 0.07) ** 2)))
      : 1
    if (tube.current) tube.current.opacity = level
    if (glow.current) glow.current.opacity = 0.75 * level
    if (light.current) light.current.intensity = 0.22 * level
    if (striking) state.invalidate()
  })

  const signWidth = 0.95
  return (
    <group position={[centre, 0, WALL_Z]}>
      <mesh position={[0, 0.55, 0]} receiveShadow>
        <planeGeometry args={[DESK.length + 1.2, 1.4]} />
        <meshStandardMaterial map={paper} roughness={0.88} color="#6e5a52" />
      </mesh>
      {neon && (
        <group position={[sign.x - centre, 0.25, 0.01]} scale={sign.scale}>
          {/* The glow and the tubes share one layout, so the halo sits exactly round the letters. */}
          <mesh position={[0, 0, 0.002]}>
            <planeGeometry args={[signWidth, signWidth * 0.25]} />
            <meshBasicMaterial
              ref={glow}
              map={neon.glow}
              color="#ff5418"
              transparent
              opacity={0}
              blending={AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          <mesh position={[0, 0, 0.004]}>
            <planeGeometry args={[signWidth, signWidth * 0.25]} />
            <meshBasicMaterial ref={tube} map={neon.tube} color="#ffa46b" transparent opacity={0} depthWrite={false} toneMapped={false} />
          </mesh>
          <pointLight ref={light} position={[0, 0, 0.25]} color="#ff6a2a" intensity={0} distance={1.8} decay={2} />
        </group>
      )}
    </group>
  )
}
