import { Environment, Lightformer, RoundedBox } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AdditiveBlending,
  CatmullRomCurve3,
  MathUtils,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  TubeGeometry,
  Vector3,
  type Group,
} from 'three'
import { palette } from '../../brand/brand'
import type { Mix } from '../../content/types'
import { casaSound, NEEDLE_DROP } from '../../lib/casaSound'
import { loadTvAssets, type TvAssets } from '../channels'
import { glowTexture } from '../room/textures'
import {
  ARM_HEIGHT,
  ARM_LENGTH,
  armPose,
  HEADSHELL_OFFSET,
  LIFT_ANGLE,
  PIVOT,
  RECORD_TOP,
  REST,
  trackSwing,
  type Pose,
} from './arm'
import { pageShadowTexture, recordLabelTexture, strobeTexture, vinylMaps } from './textures'

/** 33⅓ revolutions a minute, in radians a second. */
const SPEED = ((100 / 3) * Math.PI * 2) / 60
const PLINTH = { width: 0.453, depth: 0.353, centreX: 0.0365, centreZ: 0.0065 }
const PLATTER = 0.166
const RECORD = 0.151

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
  }
}

interface TurntableProps {
  on: boolean
  /** When the radio last started or stopped (`performance.now()`): the arm's moves are timed from it. */
  since: number
  mix: Mix
}

/**
 * Casa Radio's turntable. On play the platter spins up and the arm lifts, swings over the record and lowers, the
 * needle landing as the music starts; it then creeps inwards as the mix plays. On pause the arm lifts and goes back
 * to its rest, and the platter brakes. Frames are drawn only while something moves.
 */
export function Turntable({ on, since, mix }: TurntableProps) {
  const invalidate = useThree((state) => state.invalidate)
  const platter = useRef<Group>(null)
  const swing = useRef<Group>(null)
  const pitch = useRef<Group>(null)
  const lever = useRef<Group>(null)
  const motion = useRef({ angle: 0, speed: 0, pose: { swing: REST, lift: 0 } as Pose, from: { swing: REST, lift: 0 } as Pose, since: -1 })
  const [assets, setAssets] = useState<TvAssets | null>(null)

  useEffect(() => {
    let live = true
    loadTvAssets().then((loaded) => {
      if (live) setAssets(loaded)
    })
    return () => {
      live = false
    }
  }, [])

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
  const label = useMemo(() => recordLabelTexture(mix, assets), [mix, assets])

  useEffect(() => () => label.dispose(), [label])
  useEffect(() => {
    invalidate()
  }, [on, since, label, invalidate])

  useFrame((state, delta) => {
    const m = motion.current
    const dt = Math.min(delta, 0.05)
    // A new move starts from wherever the arm is now.
    if (m.since !== since) {
      m.from = { ...m.pose }
      m.since = since
    }
    const elapsed = (performance.now() - since) / 1000
    m.pose = armPose(elapsed, m.from, on ? trackSwing(casaSound.progress()) : REST)

    // Up to speed in under a second; on stop, the brake once the arm has lifted.
    const turning = on || elapsed < 0.2
    m.speed = MathUtils.damp(m.speed, turning ? SPEED : 0, turning ? 3.2 : 2.4, dt)
    if (!turning && m.speed < 0.01) m.speed = 0
    m.angle = (m.angle + m.speed * dt) % (Math.PI * 2)

    if (platter.current) platter.current.rotation.y = -m.angle
    if (swing.current) swing.current.rotation.y = m.pose.swing
    if (pitch.current) pitch.current.rotation.x = -m.pose.lift * LIFT_ANGLE
    if (lever.current) lever.current.rotation.x = -0.45 * m.pose.lift

    const settled = !on && m.speed === 0 && elapsed > NEEDLE_DROP
    if (!settled) state.invalidate()
  })

  const { width, depth, centreX, centreZ } = PLINTH
  return (
    <group>
      {/* Its shadow on the page. */}
      <mesh position={[centreX, -0.0965, centreZ + 0.012]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[width * 1.45, depth * 1.6]} />
        <meshBasicMaterial map={shadow} transparent opacity={0.6} depthWrite={false} />
      </mesh>

      {/* Plinth: a dark body under a brushed aluminium top plate, on four rubber feet. */}
      <RoundedBox args={[width, 0.07, depth]} radius={0.008} smoothness={4} position={[centreX, -0.041, centreZ]} material={made.body} />
      <RoundedBox
        args={[width - 0.002, 0.008, depth - 0.002]}
        radius={0.003}
        smoothness={3}
        position={[centreX, -0.004, centreZ]}
        material={made.brushed}
        receiveShadow
      />
      {[
        [-0.14, -0.12],
        [0.213, -0.12],
        [-0.14, 0.133],
        [0.213, 0.133],
      ].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, -0.086, z]} material={made.rubber}>
          <cylinderGeometry args={[0.032, 0.035, 0.02, 32]} />
        </mesh>
      ))}

      {/* Controls: start/stop, the speed buttons and the pitch slider. */}
      <mesh position={[-0.155, 0.002, 0.158]} material={made.chrome} castShadow>
        <boxGeometry args={[0.046, 0.005, 0.03]} />
      </mesh>
      {[-0.104, -0.081].map((x) => (
        <mesh key={x} position={[x, 0.0015, 0.163]} material={made.blackMetal}>
          <boxGeometry args={[0.018, 0.004, 0.012]} />
        </mesh>
      ))}
      <mesh position={[0.225, 0.0004, 0.07]} material={made.rubber}>
        <boxGeometry args={[0.012, 0.0012, 0.13]} />
      </mesh>
      <mesh position={[0.225, 0.004, 0.078]} material={made.blackMetal} castShadow>
        <boxGeometry args={[0.03, 0.008, 0.014]} />
      </mesh>

      {/* The strobe light by the platter's edge, glowing Casa orange on the dots. */}
      <mesh position={[-0.148, 0.004, 0.11]} rotation-y={0.8}>
        <boxGeometry args={[0.022, 0.008, 0.012]} />
        <meshStandardMaterial color="#ff7a3a" emissive="#ff5a1c" emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
      <sprite position={[-0.148, 0.01, 0.11]} scale={0.07} raycast={() => null}>
        <spriteMaterial map={halo} color="#ff6a2a" transparent opacity={0.55} blending={AdditiveBlending} depthWrite={false} />
      </sprite>
      <pointLight position={[-0.14, 0.012, 0.1]} color="#ff6a2a" intensity={0.08} distance={0.14} decay={2} />

      {/* Platter, mat and record turn together. */}
      <group ref={platter}>
        <mesh position={[0, 0.01, 0]} material={strobe}>
          <cylinderGeometry args={[PLATTER, PLATTER, 0.012, 128, 1, true]} />
        </mesh>
        <mesh position={[0, 0.016, 0]} rotation-x={-Math.PI / 2} material={made.rubber} receiveShadow>
          <circleGeometry args={[PLATTER, 96]} />
        </mesh>
        <mesh position={[0, RECORD_TOP - 0.0009, 0]} material={made.edge}>
          <cylinderGeometry args={[RECORD, RECORD, 0.0018, 128, 1, true]} />
        </mesh>
        <mesh position={[0, RECORD_TOP, 0]} rotation-x={-Math.PI / 2} material={vinyl} receiveShadow>
          <circleGeometry args={[RECORD, 160]} />
        </mesh>
        <mesh position={[0, RECORD_TOP + 0.0002, 0]} rotation-x={-Math.PI / 2} receiveShadow>
          <circleGeometry args={[0.05, 64]} />
          <meshStandardMaterial map={label} roughness={0.7} />
        </mesh>
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
        </group>
      </group>
    </group>
  )
}
