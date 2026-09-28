import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CanvasTexture,
  LinearMipmapLinearFilter,
  MathUtils,
  RepeatWrapping,
  Vector2,
  Vector3,
  type ShaderMaterial,
} from 'three'
import { moods, type MoodId } from '../brand/brand'
import { wallFragment, wallVertex } from './wordmark-wall.glsl'

/** The logo file and its proportions; a tile adds breathing room around it. */
const LOGO = { src: '/brand/logo.svg', width: 1600, height: 240 }
const TILE = { width: 1024, padX: 1.12, padY: 1.18 }

function srgb(hex: string) {
  const value = parseInt(hex.slice(1), 16)
  return new Vector3(((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255)
}

function dampVector(current: Vector3, target: Vector3, lambda: number, delta: number) {
  current.x = MathUtils.damp(current.x, target.x, lambda, delta)
  current.y = MathUtils.damp(current.y, target.y, lambda, delta)
  current.z = MathUtils.damp(current.z, target.z, lambda, delta)
  return current.distanceToSquared(target) > 1e-6
}

/** Draws the logo once into a tile that repeats in both directions. */
async function loadTile() {
  const image = new Image()
  image.crossOrigin = 'anonymous'
  image.src = LOGO.src
  await image.decode()
  const logoWidth = TILE.width / TILE.padX
  const logoHeight = logoWidth * (LOGO.height / LOGO.width)
  const canvas = document.createElement('canvas')
  canvas.width = TILE.width
  canvas.height = Math.round(logoHeight * TILE.padY)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas unavailable')
  ctx.drawImage(image, (canvas.width - logoWidth) / 2, (canvas.height - logoHeight) / 2, logoWidth, logoHeight)
  const texture = new CanvasTexture(canvas)
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.minFilter = LinearMipmapLinearFilter
  return { texture, aspect: canvas.width / canvas.height }
}

interface WordmarkWallProps {
  mood: MoodId
  animate: boolean
}

export function WordmarkWall({ mood, animate }: WordmarkWallProps) {
  const invalidate = useThree((state) => state.invalidate)
  const gl = useThree((state) => state.gl)
  const material = useRef<ShaderMaterial>(null)

  // Created once from the first colourway; later colourways animate these values instead.
  const [uniforms] = useState(() => {
    const start = moods[mood]
    return {
      uTile: { value: null as CanvasTexture | null },
      uTileAspect: { value: 1 },
      uRowHeight: { value: 90 },
      uTime: { value: 0 },
      // Lamps start mid-breath so a frozen (reduced-motion) wall still shows them.
      uLampTime: { value: 2 },
      uResolution: { value: new Vector2(1, 1) },
      uPointer: { value: new Vector2(0, 0) },
      uLens: { value: 0 },
      uBase: { value: srgb(start.base) },
      uPattern: { value: srgb(start.pattern) },
      uGlow: { value: srgb(start.glow) },
      uGlowStrength: { value: start.glowStrength },
      // Fades in once the tile has loaded.
      uOpacity: { value: 0 },
    }
  })
  const [tile, setTile] = useState<{ texture: CanvasTexture; aspect: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    let loaded: CanvasTexture | undefined
    loadTile().then(
      (result) => {
        if (cancelled) return result.texture.dispose()
        loaded = result.texture
        result.texture.anisotropy = gl.capabilities.getMaxAnisotropy()
        setTile(result)
        invalidate()
      },
      (error) => console.warn('Wordmark wall unavailable.', error),
    )
    return () => {
      cancelled = true
      loaded?.dispose()
    }
  }, [gl, invalidate])

  const target = useMemo(() => {
    const m = moods[mood]
    return {
      base: srgb(m.base),
      pattern: srgb(m.pattern),
      opacity: m.patternOpacity,
      glow: srgb(m.glow),
      glowStrength: m.glowStrength,
    }
  }, [mood])

  // The canvas sits behind the page and receives no events, so follow the pointer on the window.
  const pointer = useRef(new Vector2(0, 0))
  const pointerActive = useRef(false)
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      pointerActive.current = event.pointerType === 'mouse'
      pointer.current.set((event.clientX / window.innerWidth) * 2 - 1, 1 - (event.clientY / window.innerHeight) * 2)
    }
    const onLeave = () => {
      pointerActive.current = false
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    return () => {
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  useEffect(() => invalidate(), [mood, invalidate])

  useFrame((state, rawDelta) => {
    const u = material.current?.uniforms
    if (!u) return
    const delta = Math.min(rawDelta, 0.1)
    const { width, height } = state.size
    u.uResolution.value.set(width, height)
    // About nine rows on a laptop, fewer and larger on phones.
    u.uRowHeight.value = MathUtils.clamp(height / 9, 56, 130)
    if (tile && u.uTile.value !== tile.texture) {
      u.uTile.value = tile.texture
      u.uTileAspect.value = tile.aspect
    }

    let settling = dampVector(u.uBase.value, target.base, 2.6, delta)
    settling = dampVector(u.uPattern.value, target.pattern, 2.6, delta) || settling
    settling = dampVector(u.uGlow.value, target.glow, 2.6, delta) || settling
    u.uGlowStrength.value = MathUtils.damp(u.uGlowStrength.value, target.glowStrength, 2.6, delta)
    const opacity = tile ? target.opacity : 0
    u.uOpacity.value = MathUtils.damp(u.uOpacity.value, opacity, 2.6, delta)
    settling ||= Math.abs(u.uOpacity.value - opacity) > 1e-3

    if (animate) {
      u.uTime.value += delta
      u.uLampTime.value += delta
      u.uPointer.value.lerp(pointer.current, 1 - Math.exp(-4 * delta))
      u.uLens.value = MathUtils.damp(u.uLens.value, pointerActive.current ? 1 : 0, 3, delta)
    } else if (settling) {
      invalidate()
    }
  })

  return (
    <mesh frustumCulled={false} renderOrder={-1}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={material}
        vertexShader={wallVertex}
        fragmentShader={wallFragment}
        uniforms={uniforms}
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}
