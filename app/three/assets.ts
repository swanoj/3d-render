/*
 * The brand marks and fonts that canvas textures draw with (the Casa Radio turntable's record labels), loaded once.
 * The marks are the official PNGs from the branding pack, drawn in charcoal and recoloured here.
 */

export interface MarkAssets {
  logo: HTMLImageElement
  submark: HTMLImageElement
  check: HTMLImageElement
}

const HAND = '400 40px "Felt Tip Senior", "Marker Felt", cursive'
const BOLD = '700 40px "Helvetica Neue", Helvetica, Arimo, Arial, sans-serif'
const MONO = '400 20px "Roboto Mono", ui-monospace, monospace'

// The marks' drawn proportions. Browsers disagree on the natural size of an SVG (Firefox has reported 0×0 and
// Safari a default 300×150 box when a file has no width and height), so drawing never relies on it for those.
const MARK_SIZES: Record<string, [number, number]> = {
  'primary-logo': [1664, 225],
  emblem: [257, 212],
  check: [560, 440],
}

/** Resolves once the image has loaded or failed; a failed image is drawn as nothing rather than stopping the render. */
function loadImage(src: string) {
  const image = new Image()
  image.crossOrigin = 'anonymous'
  const loaded = new Promise<HTMLImageElement>((resolve) => {
    image.onload = () => resolve(image)
    image.onerror = () => {
      console.warn(`Could not load ${src}.`)
      resolve(image)
    }
  })
  image.src = src
  return loaded
}

/** Waits for a font, but never for more than a few seconds or past an error: the canvas falls back to system type. */
function loadFont(style: string) {
  return Promise.race([
    document.fonts.load(style).catch(() => []),
    new Promise((resolve) => window.setTimeout(resolve, 3000)),
  ])
}

let assets: Promise<MarkAssets> | undefined

/** Always resolves. */
export function loadMarkAssets() {
  assets ??= Promise.all([
    loadImage('/brand/official/primary-logo.png'),
    loadImage('/brand/official/emblem.png'),
    loadImage('/brand/check.svg'),
    loadFont(HAND),
    loadFont(BOLD),
    loadFont(MONO),
  ]).then(([logo, submark, check]) => ({ logo, submark, check }))
  return assets
}

const tints = new Map<string, HTMLCanvasElement>()

/**
 * A brand mark recoloured, cached per colour and size. A mark that failed to load comes back as an empty 1×1
 * canvas, which is safe to draw.
 */
export function tinted(image: HTMLImageElement, color: string, width: number) {
  const name = image.src.match(/\/([\w-]+)\.(?:svg|png)/)?.[1] ?? ''
  const [markWidth, markHeight] = MARK_SIZES[name] ?? [image.naturalWidth, image.naturalHeight]
  const usable = image.complete && image.naturalWidth > 0 && markWidth > 0 && markHeight > 0
  const key = `${image.src}|${color}|${width}|${usable}`
  let canvas = tints.get(key)
  if (!canvas) {
    canvas = document.createElement('canvas')
    canvas.width = usable ? width : 1
    canvas.height = usable ? Math.max(1, Math.round((width * markHeight) / markWidth)) : 1
    const ctx = canvas.getContext('2d')
    if (ctx && usable) {
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
      ctx.globalCompositeOperation = 'source-in'
      ctx.fillStyle = color
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
    tints.set(key, canvas)
  }
  return canvas
}
