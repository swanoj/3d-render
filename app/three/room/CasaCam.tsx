import { useFrame } from '@react-three/fiber'
import { useRef, type RefObject } from 'react'
import type { Group, MeshBasicMaterial, PerspectiveCamera } from 'three'
import { CENTRE_Y, FRONT_Z, SCREEN_X } from './layout'

/** Where the security camera hangs: high over the front of the room, looking down at the set. */
const MOUNT: [number, number, number] = [1.25, 3.55, 4.3]
const LOOK_AT = [SCREEN_X + 0.1, CENTRE_Y - 0.15, FRONT_Z] as const
const DX = LOOK_AT[0] - MOUNT[0]
const DY = LOOK_AT[1] - MOUNT[1]
const DZ = LOOK_AT[2] - MOUNT[2]
// The head's aim, as a turn and a tilt from looking straight down -z.
const AIM: [number, number, number, 'YXZ'] = [Math.atan2(DY, Math.hypot(DX, DZ)), Math.atan2(-DX, -DZ), 0, 'YXZ']

interface CasaCamProps {
  /** The camera the set films the room with; it sits just in front of the lens. */
  camera: RefObject<PerspectiveCamera | null>
  /** Casa Cam is on: the recording light blinks. */
  live: boolean
  reducedMotion: boolean
}

/**
 * The security camera Casa Cam films from, hanging on a pole from the ceiling. It pans slowly across the set, and
 * because the set is in its own picture, the screen shows a tunnel of itself.
 */
export function CasaCam({ camera, live, reducedMotion }: CasaCamProps) {
  const head = useRef<Group>(null)
  const light = useRef<MeshBasicMaterial>(null)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (head.current) head.current.rotation.y = AIM[1] + (reducedMotion ? 0 : Math.sin(t * 0.21) * 0.16)
    const on = live && (reducedMotion || t % 1.4 < 0.9)
    light.current?.color.setRGB(on ? 5 : 0.35, on ? 0.35 : 0.04, on ? 0.2 : 0.03)
  })

  const plastic = <meshStandardMaterial color="#7d766c" roughness={0.45} metalness={0.05} />
  const metal = <meshStandardMaterial color="#3a3531" roughness={0.4} metalness={0.8} />

  return (
    <group position={MOUNT}>
      <mesh position={[0, 1.53, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 3, 8]} />
        {metal}
      </mesh>
      <mesh>
        <sphereGeometry args={[0.035, 16, 12]} />
        {metal}
      </mesh>
      <group ref={head} rotation={AIM}>
        <mesh position={[0, -0.1, 0.02]}>
          <boxGeometry args={[0.17, 0.15, 0.4]} />
          {plastic}
        </mesh>
        {/* The sun hood. */}
        <mesh position={[0, -0.015, -0.01]}>
          <boxGeometry args={[0.21, 0.018, 0.46]} />
          {plastic}
        </mesh>
        <mesh position={[0, -0.1, -0.2]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.055, 0.06, 0.06, 24]} />
          <meshStandardMaterial color="#141416" roughness={0.3} metalness={0.6} />
        </mesh>
        <mesh position={[0, -0.1, -0.231]} rotation-y={Math.PI}>
          <circleGeometry args={[0.045, 24]} />
          <meshPhysicalMaterial color="#05060a" roughness={0.05} clearcoat={1} envMapIntensity={2} />
        </mesh>
        <mesh position={[0.058, -0.045, -0.181]}>
          <sphereGeometry args={[0.011, 10, 10]} />
          <meshBasicMaterial ref={light} color={[0.35, 0.04, 0.03]} toneMapped={false} />
        </mesh>
        <perspectiveCamera ref={camera} args={[50, 4 / 3, 0.1, 40]} position={[0, -0.1, -0.3]} />
      </group>
    </group>
  )
}
