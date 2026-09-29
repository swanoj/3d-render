import { RoundedBox } from '@react-three/drei'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  Color,
  MathUtils,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  Vector3,
  type Group,
  type InstancedMesh,
} from 'three'
import { palette } from '../../brand/brand'
import { casaSound, type DeckIndex, type Eq } from '../../lib/casaSound'
import { knurlTexture } from '../room/textures'
import { grab, pointerOn, release } from '../turntable/drag'
import { keepDrawing } from './layout'
import { faceplateTexture, knobCapTexture } from './textures'

const BODY = { width: 0.3, height: 0.09, depth: 0.36 }
const TOP = BODY.height
/** Faceplate coordinates (x across, z towards the front), matching the printed legends. */
const CHANNELS = [-0.072, 0.072] as const
const KNOBS: { band: keyof Eq; z: number }[] = [
  { band: 'trim', z: -0.094 },
  { band: 'high', z: -0.055 },
  { band: 'mid', z: -0.021 },
  { band: 'low', z: 0.013 },
]
/** A channel fader's travel, from all the way up (full) to all the way down (off); and the crossfader's. */
const FADER = { up: 0.034, down: 0.106 }
const CROSS = 0.044
const LEDS = 10
const LED_COLOURS = Array.from({ length: LEDS }, (_, i) =>
  new Color(i < 6 ? '#3dff6e' : i < 8 ? '#ffc23d' : '#ff3b2f'),
)
const LED_OFF = new Color('#1a1b1d')
/** A knob turns 135° either way from the middle. */
const KNOB_TURN = 2.36

/** Something on the mixer that's dragged. */
type Control =
  | { kind: 'fader'; key: string; deck: DeckIndex }
  | { kind: 'cross'; key: string }
  | { kind: 'knob'; key: string; deck: DeckIndex; band: keyof Eq }

/**
 * A two-channel club mixer between the decks: brushed faceplate, gain and three-band EQ for each channel, channel
 * faders, a Casa-orange crossfader and a pair of LED meters. Everything on it works: drag the faders, turn a knob
 * by dragging up or down (double-click puts it back to the middle), and the meters dance to each deck.
 */
export function Mixer({ position }: { position: [number, number, number] }) {
  const invalidate = useThree((state) => state.invalidate)
  const root = useRef<Group>(null)
  const leds = useRef<InstancedMesh>(null)
  const crossfader = useRef<Group>(null)
  const faders = useRef<(Group | null)[]>([])
  const knobs = useRef<(Group | null)[]>([])
  const level = useRef([0, 0])
  const drag = useRef<{ key: string; pointer: number; y: number } | null>(null)
  const [hover, setHover] = useState(false)
  const [grabbing, setGrabbing] = useState(false)

  const cursor = grabbing ? 'grabbing' : hover ? 'grab' : null
  useEffect(() => {
    if (!cursor) return
    document.body.style.cursor = cursor
    return () => {
      document.body.style.cursor = 'auto'
    }
  }, [cursor])

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

  // Two columns of LEDs in the meter window, one for each channel.
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

  // The controls: faders slide under the pointer, knobs turn as it moves up or down the screen.
  const hit = useMemo(() => new Vector3(), [])
  const adjust = (control: Control, event: ThreeEvent<PointerEvent>) => {
    if (control.kind === 'knob') {
      const held = drag.current
      const y = event.nativeEvent.clientY
      const value = casaSound.controls().eq[control.deck][control.band] + ((held?.y ?? y) - y) / 110
      if (held) held.y = y
      // A detent in the middle, as on the real knob.
      casaSound.setEq(control.deck, control.band, Math.abs(value) < 0.04 ? 0 : value)
      return
    }
    const point = root.current ? pointerOn(event, root.current, TOP, hit) : null
    if (!point) return
    if (control.kind === 'fader') casaSound.setFader(control.deck, (FADER.down - point.z) / (FADER.down - FADER.up))
    else casaSound.setCrossfader(point.x / CROSS)
  }
  const dragAs = (control: Control) => {
    const mine = (event: ThreeEvent<PointerEvent>) => drag.current?.key === control.key && drag.current.pointer === event.pointerId
    const end = (event: ThreeEvent<PointerEvent>) => {
      if (!mine(event)) return
      drag.current = null
      release(event)
      setGrabbing(false)
      keepDrawing(400)
    }
    return {
      onPointerDown(event: ThreeEvent<PointerEvent>) {
        if (event.button > 0 || drag.current) return
        grab(event)
        drag.current = { key: control.key, pointer: event.pointerId, y: event.nativeEvent.clientY }
        if (control.kind !== 'knob') adjust(control, event)
        setGrabbing(true)
        keepDrawing(400)
        invalidate()
      },
      onPointerMove(event: ThreeEvent<PointerEvent>) {
        if (!mine(event)) return
        event.stopPropagation()
        adjust(control, event)
        keepDrawing(400)
        invalidate()
      },
      onPointerUp: end,
      onPointerCancel: end,
      onLostPointerCapture: end,
    }
  }

  const pointAt = {
    onPointerOver(event: ThreeEvent<PointerEvent>) {
      event.stopPropagation()
      setHover(true)
    },
    onPointerOut() {
      setHover(false)
    },
  }

  useFrame((_, delta) => {
    const mesh = leds.current
    const dt = Math.min(delta, 0.05)
    const { faders: faderLevels, crossfader: cross, eq } = casaSound.controls()
    for (const i of [0, 1] as const) {
      // A fast attack and a slower fall, like a real meter. It reads the channel before its fader.
      const pulse = casaSound.deckPulse(i) * 10 ** ((eq[i].trim < 0 ? eq[i].trim * 12 : eq[i].trim * 6) / 20)
      const playing = casaSound.isPlaying(i)
      level.current[i] = pulse > level.current[i] ? pulse : MathUtils.damp(level.current[i], pulse, 6, dt)
      if (mesh) {
        const lit = Math.round(Math.min(1, level.current[i]) * 0.8 * LEDS + (playing ? 2 : 0))
        for (let led = 0; led < LEDS; led++) mesh.setColorAt(i * LEDS + led, led < lit ? LED_COLOURS[led] : LED_OFF)
      }
      const fader = faders.current[i]
      if (fader) fader.position.z = MathUtils.lerp(FADER.down, FADER.up, faderLevels[i])
      KNOBS.forEach(({ band }, row) => {
        const knob = knobs.current[i * KNOBS.length + row]
        if (knob) knob.rotation.y = -eq[i][band] * KNOB_TURN
      })
    }
    if (mesh?.instanceColor) mesh.instanceColor.needsUpdate = true
    if (crossfader.current) crossfader.current.position.x = cross * CROSS
  })

  return (
    <group ref={root} position={position}>
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

      {/* Gain and EQ knobs for each channel; the cap's pointer line faces the back at the middle setting. */}
      {CHANNELS.flatMap((x, c) =>
        KNOBS.map(({ band, z }, r) => (
          <group
            key={`${c}${band}`}
            ref={(node) => void (knobs.current[c * KNOBS.length + r] = node)}
            position={[x, TOP + 0.007, z]}
          >
            <mesh rotation-y={Math.PI / 2} material={[made.knobSide, made.knobTop, made.knobSide]} castShadow>
              <cylinderGeometry args={[r === 0 ? 0.0105 : 0.0095, r === 0 ? 0.0115 : 0.0105, 0.014, 32]} />
            </mesh>
            <mesh
              visible={false}
              {...dragAs({ kind: 'knob', key: `knob${c}${band}`, deck: c as DeckIndex, band })}
              {...pointAt}
              onDoubleClick={(event) => {
                event.stopPropagation()
                casaSound.setEq(c as DeckIndex, band, 0)
                invalidate()
              }}
            >
              <cylinderGeometry args={[0.016, 0.016, 0.02, 12]} />
            </mesh>
          </group>
        )),
      )}

      {/* Channel faders, and the crossfader in Casa orange. */}
      {CHANNELS.map((x, i) => (
        <group key={x}>
          <group ref={(node) => void (faders.current[i] = node)} position={[x, TOP + 0.006, FADER.up]}>
            <mesh material={made.cap} castShadow>
              <boxGeometry args={[0.02, 0.012, 0.011]} />
            </mesh>
            <mesh position={[0, 0.0062, 0]} material={made.jack}>
              <boxGeometry args={[0.02, 0.0004, 0.0015]} />
            </mesh>
          </group>
          <mesh visible={false} position={[x, TOP + 0.006, (FADER.up + FADER.down) / 2]} {...dragAs({ kind: 'fader', key: `fader${i}`, deck: i as DeckIndex })} {...pointAt}>
            <boxGeometry args={[0.034, 0.016, FADER.down - FADER.up + 0.02]} />
          </mesh>
        </group>
      ))}
      <group ref={crossfader} position={[0, TOP + 0.006, 0.146]}>
        <mesh material={made.orange} castShadow>
          <boxGeometry args={[0.012, 0.012, 0.02]} />
        </mesh>
      </group>
      <mesh visible={false} position={[0, TOP + 0.006, 0.146]} {...dragAs({ kind: 'cross', key: 'cross' })} {...pointAt}>
        <boxGeometry args={[CROSS * 2 + 0.03, 0.016, 0.034]} />
      </mesh>

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
