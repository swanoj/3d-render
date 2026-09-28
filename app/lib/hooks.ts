import { useEffect, useState, useSyncExternalStore } from 'react'
import { mixes } from '../content/radio'
import { casaSound, type RadioState } from './casaSound'

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

/**
 * The current time, ticking every `every` ms after hydration. Starts from `initial` so server and client agree;
 * `offset` carries a previewed time (`?now=…`) on.
 */
export function useNow(initial: number, { every = 1000, offset = 0 } = {}) {
  const [now, setNow] = useState(initial)
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now() + offset), every)
    return () => window.clearInterval(id)
  }, [every, offset])
  return now
}

/** Casa Radio's state, shared by every control on the page. Off on the server. */
export function useRadio() {
  return useSyncExternalStore(casaSound.subscribe, casaSound.radio, radioIdle)
}

const idle: RadioState = { on: false, mix: mixes[0] }
const radioIdle = () => idle
