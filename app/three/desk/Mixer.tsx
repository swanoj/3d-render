import { RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  Color,
  MathUtils,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  type Group,
  type InstancedMesh,
} from 'three'
import { palette } from '../../brand/brand'
import { casaSound } from '../../lib/casaSound'
import { knurlTexture } from '../room/textures'
import { faceplateTexture, knobCapTexture } from './textures'

const BODY = { width: 0.3, height: 0.09, depth: 0.36 }
const TOP = BODY.height
/** Faceplate coordinates (x across, z towards the front), matching the printed legends. */
const CHANNELS = [-0.072, 0.072]
const KNOB_ROWS = [-0.094, -0.055, -0.021, 0.013]
const LEDS = 10
const LED_COLOURS = Array.from({ length: LEDS }, (_, i) =>
  new Color(i < 6 ? '#3dff6e' : i < 8 ? '#ffc23d' : '#ff3b2f'),
)
const LED_OFF = new Color('#1a1b1d')
// Where each EQ knob is set, so the mixer looks mid-set rather than factory-fresh.
const SETTINGS = [0.2, -0.4, 0.1, 0.5, -0.1, 0.3, -0.5, 0.15]

/**
 * A two-channel club mixer between the decks: brushed faceplate, EQ knobs, channel faders, a crossfader leaning
 * to the playing deck and a pair of LED meters dancing to Casa Radio's kick.
 */
export function Mixer({ position, on }: { position: [number, number, number]; on: boolean }) {
  const leds = useRef<InstancedMesh>(null)
  const crossfader = useRef<Group>(null)
  const faders = useRef<(Group | null)[]>([])
  const level = useRef({ left: 0, right: 0 })

  const made = useMemo(() => {
    const knurl = knurlTexture()
    return {
      body: new MeshPhysicalMaterial({ color: '#19191c', metalness: 0.55, roughness: 0.38, clearcoat: 0.2 }),
      face: new MeshPhysicalMaterial({ map: faceplateTexture(), metalness: 0.5, roughness: 0.42 }),
      knobSide: new MeshStandardMaterial({ color: '#1d1d20', roughness: 0.5, bumpMap: knurl, bumpScale: 0.6 }),
      knobTop: new MeshStandardMaterial({ map: knobCapTexture(), roughness: 0.35 }),
      cap: new MeshPhysicalMaterial({ color: '#2a2a2e', roughness: 0.5, clearcoat: 0.4 }),
      orange: new MeshPhysicalMaterial({ color: palette.orange, roughness: 0.35, clearcoat: 0.6 }),
      led: new MeshBasicMaterial({ toneMapped: false }),
      jack: new MeshPhysicalMaterial({ color: '#c9c9cc', metalness: 1, roughness: 0.2 }),
    }
  }, [])

  // Two columns of LEDs in the meter window.
  const dummy = useMemo(() => new Object3D(), [])
  useLayoutEffect(() => {
    const mesh = leds.current
    if (!mesh) return
    for (let column = 0; column < 2; column++) {
      for (let i = 0; i < LEDS; i++) {
        dummy.position.set(column ? 0.011 : -0.011, TOP + 0.0012, -0.012 - i * 0.0095)
        dummy.updateMatrix()
        mesh.setMatrixAt(column * LEDS + i, dummy.matrix)
        mesh.setColorAt(column * LEDS + i, LED_OFF)
      }
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [dummy])

  useFrame((_, delta) => {
    const mesh = leds.current
    const dt = Math.min(delta, 0.05)
    const pulse = on ? casaSound.pulse() : 0
    // A fast attack and a slower fall, like a real meter; the right channel a touch behind the left.
    const l = level.current
    l.left = pulse > l.left ? pulse : MathUtils.damp(l.left, pulse, 6, dt)
    l.right = pulse * 0.93 > l.right ? pulse * 0.93 : MathUtils.damp(l.right, pulse * 0.93, 5, dt)
    if (mesh) {
      for (let column = 0; column < 2; column++) {
        const lit = Math.round((column ? l.right : l.left) * 0.8 * LEDS + (on ? 2 : 0))
        for (let i = 0; i < LEDS; i++) mesh.setColorAt(column * LEDS + i, i < lit ? LED_COLOURS[i] : LED_OFF)
      }
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    }
    // Channel 1 (the playing deck) up; the crossfader over to its side.
    faders.current.forEach((fader, i) => {
      if (fader) fader.position.z = MathUtils.damp(fader.position.z, on && i === 0 ? 0.038 : 0.1, 5, dt)
    })
    if (crossfader.current) {
      crossfader.current.position.x = MathUtils.damp(crossfader.current.position.x, on ? -0.044 : 0, 4, dt)
    }
  })

  return (
    <group position={position}>
      <RoundedBox
        args={[BODY.width, BODY.height, BODY.depth]}
        radius={0.008}
        smoothness={4}
        position={[0, BODY.height / 2, 0]}
        material={made.body}
        castShadow
        receiveShadow
      />
      <mesh position={[0, TOP + 0.0004, 0]} rotation-x={-Math.PI / 2} material={made.face} receiveShadow>
        <planeGeometry args={[BODY.width - 0.012, BODY.depth - 0.012]} />
      </mesh>

      {/* Gain and EQ knobs for each channel. */}
      {CHANNELS.flatMap((x, c) =>
        KNOB_ROWS.map((z, r) => (
          <group key={`${c}${r}`} position={[x, TOP + 0.007, z]} rotation-y={-SETTINGS[c * 4 + r] * 2.2}>
            <mesh material={[made.knobSide, made.knobTop, made.knobSide]} castShadow>
              <cylinderGeometry args={[r === 0 ? 0.0105 : 0.0095, r === 0 ? 0.0115 : 0.0105, 0.014, 32]} />
            </mesh>
          </group>
        )),
      )}

      {/* Channel faders, and the crossfader in Casa orange. */}
      {CHANNELS.map((x, i) => (
        <group key={x} ref={(node) => void (faders.current[i] = node)} position={[x, TOP + 0.006, 0.1]}>
          <mesh material={made.cap} castShadow>
            <boxGeometry args={[0.02, 0.012, 0.011]} />
          </mesh>
          <mesh position={[0, 0.0062, 0]} material={made.jack}>
            <boxGeometry args={[0.02, 0.0004, 0.0015]} />
          </mesh>
        </group>
      ))}
      <group ref={crossfader} position={[0, TOP + 0.006, 0.146]}>
        <mesh material={made.orange} castShadow>
          <boxGeometry args={[0.012, 0.012, 0.02]} />
        </mesh>
      </group>

      <instancedMesh ref={leds} args={[undefined, undefined, LEDS * 2]} material={made.led}>
        <boxGeometry args={[0.012, 0.0016, 0.0062]} />
      </instancedMesh>

      {/* The headphone jack on the front, and a power light. */}
      <mesh position={[-0.1, 0.03, BODY.depth / 2 + 0.001]} material={made.jack}>
        <circleGeometry args={[0.0055, 24]} />
      </mesh>
      <mesh position={[0.11, 0.03, BODY.depth / 2 + 0.001]}>
        <circleGeometry args={[0.0028, 16]} />
        <meshBasicMaterial color={palette.orange} toneMapped={false} />
      </mesh>
    </group>
  )
}
