import { useEffect, useState, useSyncExternalStore } from 'react'

const noopSubscribe = () => () => {}

function mediaQueryStore(query: string) {
  return {
    subscribe(onChange: () => void) {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    getSnapshot: () => window.matchMedia(query).matches,
    getServerSnapshot: () => false,
  }
}

const reducedMotion = mediaQueryStore('(prefers-reduced-motion: reduce)')

export function useReducedMotion() {
  return useSyncExternalStore(
    reducedMotion.subscribe,
    reducedMotion.getSnapshot,
    reducedMotion.getServerSnapshot,
  )
}

let webglSupport: boolean | undefined

/** Whether the browser can create a WebGL context, tested once and remembered. */
function detectWebGL() {
  if (webglSupport === undefined) {
    try {
      const canvas = document.createElement('canvas')
      webglSupport = Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
    } catch {
      webglSupport = false
    }
  }
  return webglSupport
}

/** False on the server and during hydration, then whether WebGL is available. */
export function useWebGLSupport() {
  return useSyncExternalStore(noopSubscribe, detectWebGL, () => false)
}

/** The current time, ticking once a second after hydration. Starts from `initial` so server and client agree. */
export function useNow(initial: number) {
  const [now, setNow] = useState(initial)
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])
  return now
}
