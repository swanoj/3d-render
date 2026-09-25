import {
  Bounds,
  ContactShadows,
  Environment,
  Lightformer,
  OrbitControls,
} from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Component, type ReactNode } from 'react'

const reducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)',
).matches

// React Three Fiber throws when the browser cannot create a WebGL context; show a message instead of a blank page.
class WebGLBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed ? (
      <p className="fallback">This page needs WebGL to show the render.</p>
    ) : (
      this.props.children
    )
  }
}

export default function App() {
  return (
    <main className="stage">
      <WebGLBoundary>
        <Canvas
          camera={{ position: [3.2, 1.6, 4.4], fov: 38 }}
          dpr={[1, 2]}
          role="img"
          aria-label="A polished metal knot in a studio, turning slowly"
        >
          <color attach="background" args={['#0e0f13']} />

          {/* Frames the object on load and on every resize, so it fits a portrait phone too. */}
          <Bounds fit observe margin={1.15} maxDuration={reducedMotion ? 0 : 1}>
            <mesh>
              <torusKnotGeometry args={[0.9, 0.3, 256, 48]} />
              <meshPhysicalMaterial
                color="#d8d2c8"
                metalness={0.9}
                roughness={0.22}
                clearcoat={1}
                clearcoatRoughness={0.15}
              />
            </mesh>
          </Bounds>

          <ContactShadows
            position={[0, -1.8, 0]}
            opacity={0.55}
            scale={10}
            blur={2.6}
            far={4}
          />

          {/* Studio softboxes rendered into the environment map, so no HDR file is fetched. */}
          <Environment resolution={256}>
            <Lightformer intensity={4} position={[0, 5, -6]} scale={[10, 4, 1]} />
            <Lightformer intensity={2} position={[-6, 1, 2]} scale={[8, 2, 1]} />
            <Lightformer intensity={1.5} position={[6, 0, 1]} scale={[8, 2, 1]} />
            <Lightformer
              form="ring"
              color="#9fc4ff"
              intensity={3}
              position={[2, 3, 6]}
              scale={2}
            />
          </Environment>

          <OrbitControls
            makeDefault
            autoRotate={!reducedMotion}
            autoRotateSpeed={0.8}
            enableDamping
            enablePan={false}
            minDistance={3}
            maxDistance={24}
          />
        </Canvas>
      </WebGLBoundary>

      <header className="title">
        <h1>3D Render</h1>
        <p>Drag to orbit · scroll or pinch to zoom</p>
      </header>
    </main>
  )
}
