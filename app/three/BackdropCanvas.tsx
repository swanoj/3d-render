import { Canvas } from '@react-three/fiber'
import type { MoodId } from '../brand/brand'
import { WordmarkWall } from './WordmarkWall'

interface BackdropCanvasProps {
  mood: MoodId
  reducedMotion: boolean
}

/** The fixed WebGL wordmark wall behind every page. Loaded lazily after the page has rendered. */
export default function BackdropCanvas({ mood, reducedMotion }: BackdropCanvasProps) {
  return (
    <Canvas
      className="backdrop-canvas"
      dpr={[1, 1.5]}
      frameloop={reducedMotion ? 'demand' : 'always'}
      gl={{ antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'low-power' }}
      aria-hidden
    >
      <WordmarkWall mood={mood} animate={!reducedMotion} />
    </Canvas>
  )
}
