import { Component, lazy, Suspense, type ReactNode } from 'react'
import { useReducedMotion, useWebGLSupport } from '../lib/hooks'
import { useMood } from '../lib/mood'

// The WebGL wall loads as a separate chunk after the page has rendered, so three.js never delays first paint.
const BackdropCanvas = lazy(() => import('../three/BackdropCanvas'))

/** React Three Fiber throws when it cannot create a WebGL context; keep the flat version instead of failing. */
export class WebGLBoundary extends Component<{ children: ReactNode; name: string }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.warn(`WebGL unavailable, keeping the flat ${this.props.name}.`, error)
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}

/**
 * The fixed wordmark wall behind the page. A static CSS version renders first (and wherever WebGL is missing);
 * the animated WebGL wall fades in over it once loaded.
 */
export function Backdrop() {
  const webgl = useWebGLSupport()
  const reducedMotion = useReducedMotion()
  const { mood } = useMood()

  return (
    <div className="backdrop" aria-hidden>
      <div className="backdrop-static" />
      {webgl && (
        <WebGLBoundary name="wordmark wall">
          <Suspense fallback={null}>
            <BackdropCanvas mood={mood} reducedMotion={reducedMotion} />
          </Suspense>
        </WebGLBoundary>
      )}
    </div>
  )
}
