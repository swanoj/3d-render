import { Canvas } from '@react-three/fiber'
import { NeutralToneMapping } from 'three'
import type { DeckState } from '../../lib/casaSound'
import { Studio, Turntable } from './Turntable'

/** Seen from the front and a little to the right, looking down at the platter as you would over a DJ's shoulder. */
const CAMERA: [number, number, number] = [0.21, 0.71, 0.8]
const TARGET: [number, number, number] = [0.036, -0.036, 0.018]

/**
 * The radio dock's turntable (deck 1, Casa Radio's), drawn into a transparent canvas so it sits on the page with
 * its shadow. Like the room, it renders straight to the screen with no post-processing, and only draws frames
 * while something moves.
 */
export default function TurntableCanvas({ deck }: { deck: DeckState }) {
  return (
    <Canvas
      className="turntable-canvas"
      frameloop="demand"
      shadows="percentage"
      dpr={[1, 2]}
      camera={{ position: CAMERA, fov: 24, near: 0.05, far: 4 }}
      gl={{ alpha: true, antialias: true, toneMapping: NeutralToneMapping }}
      onCreated={({ camera }) => camera.lookAt(...TARGET)}
    >
      <Studio />
      <Turntable deck={deck} index={0} />
    </Canvas>
  )
}
