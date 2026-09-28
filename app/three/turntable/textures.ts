import { palette } from '../../brand/brand'
import type { Mix } from '../../content/types'
import { tinted, type TvAssets } from '../channels'
import { canvasTexture } from '../room/textures'

/*
 * The turntable's surfaces, painted into canvases at load like the room's, so there are no image files. Radii are
 * shares of the record's: the label, then the run-out, then the grooves out to the lead-in.
 */

const LABEL = 0.33
const INNER = 0.41
const OUTER = 0.975

/** A repeatable pseudo-random sequence, so the grooves come out the same every time. */
function seeded(seed: number) {
  let value = seed
  return () => {
    value = (value * 16807) % 2147483647
    return value / 2147483647
  }
}

/**
 * The vinyl's grooves. A record catches the light in a streak through the spindle: the grooves run round it, so
 * the surface is rough across them (radially) and smooth along them. The anisotropy map holds that direction
 * (red and green, in texture space) and its strength (blue); the roughness map has glossy gaps between tracks.
 */
export function vinylMaps() {
  const size = 512
  const anisotropy = canvasTexture(
    size,
    size,
    (ctx) => {
      const image = ctx.createImageData(size, size)
      const centre = size / 2
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const u = x + 0.5 - centre
          const v = centre - (y + 0.5)
          const r = Math.hypot(u, v) / centre
          const at = (y * size + x) * 4
          const strength = r > INNER && r < OUTER ? 1 : r > LABEL && r <= INNER ? 0.35 : 0
          image.data[at] = r > 0 ? ((u / (r * centre)) * 0.5 + 0.5) * 255 : 128
          image.data[at + 1] = r > 0 ? ((v / (r * centre)) * 0.5 + 0.5) * 255 : 128
          image.data[at + 2] = strength * 255
          image.data[at + 3] = 255
        }
      }
      ctx.putImageData(image, 0, 0)
    },
    false,
  )

  const roughness = canvasTexture(
    1024,
    1024,
    (ctx) => {
      const centre = 512
      const grey = (value: number) => {
        const level = Math.round(value * 255)
        return `rgb(${level},${level},${level})`
      }
      ctx.fillStyle = grey(0.18)
      ctx.fillRect(0, 0, 1024, 1024)
      // The grooves, ring by ring, each a touch rougher or smoother than the last.
      const random = seeded(11)
      const rings = 220
      const width = ((OUTER - INNER) * centre) / rings
      for (let i = 0; i < rings; i++) {
        ctx.strokeStyle = grey(0.24 + random() * 0.14)
        ctx.lineWidth = width + 0.4
        ctx.beginPath()
        ctx.arc(centre, centre, (INNER + ((OUTER - INNER) * (i + 0.5)) / rings) * centre, 0, Math.PI * 2)
        ctx.stroke()
      }
      // Glossy gaps between the tracks, and the smooth lead-in and run-out.
      ctx.strokeStyle = grey(0.1)
      for (const gap of [0.52, 0.63, 0.71, 0.8, 0.9]) {
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(centre, centre, gap * centre, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.fillStyle = grey(0.12)
      ctx.beginPath()
      ctx.arc(centre, centre, INNER * centre, 0, Math.PI * 2)
      ctx.fill()
    },
    false,
  )
  return { anisotropy, roughness }
}

/** A label in Casa orange: the submark, the station and what's playing. */
export function recordLabelTexture(mix: Mix, assets: TvAssets | null) {
  return canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = palette.orange
    ctx.beginPath()
    ctx.arc(256, 256, 256, 0, Math.PI * 2)
    ctx.fill()
    // Paper: a faint speckle, and a printed ring.
    const random = seeded(5)
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = random() < 0.5 ? 'rgba(255,240,220,0.06)' : 'rgba(80,20,0,0.06)'
      ctx.fillRect(random() * 512, random() * 512, 2, 2)
    }
    ctx.strokeStyle = 'rgba(237,225,211,0.55)'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.arc(256, 256, 232, 0, Math.PI * 2)
    ctx.stroke()

    ctx.fillStyle = palette.cream
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = '700 44px Kalam, "Marker Felt", cursive'
    ctx.fillText('CASA RADIO', 256, 104)
    if (assets) ctx.drawImage(tinted(assets.submark, palette.cream, 120), 196, 150)
    ctx.font = '500 26px "Roboto Mono", ui-monospace, monospace'
    ctx.fillText(mix.title.toUpperCase().slice(0, 22), 256, 340)
    ctx.font = '400 22px "Roboto Mono", ui-monospace, monospace'
    ctx.fillText(mix.artist.toUpperCase().slice(0, 24), 256, 376)
    ctx.font = '500 20px "Roboto Mono", ui-monospace, monospace'
    ctx.fillText('33⅓', 256, 428)
    ctx.fillStyle = '#0b0b0c'
    ctx.beginPath()
    ctx.arc(256, 256, 9, 0, Math.PI * 2)
    ctx.fill()
  })
}

/**
 * The platter's rim: brushed aluminium with four rows of strobe dots. The rim is about 87 times longer than it is
 * tall and the texture 21 times, so the dots are drawn as tall ellipses to come out round.
 */
export function strobeTexture() {
  return canvasTexture(2048, 96, (ctx) => {
    ctx.fillStyle = '#a6a5a2'
    ctx.fillRect(0, 0, 2048, 96)
    const random = seeded(3)
    for (let y = 0; y < 96; y++) {
      ctx.fillStyle = `rgba(255,255,255,${random() * 0.12})`
      ctx.fillRect(0, y, 2048, 1)
    }
    const rows = [
      { y: 14, count: 180 },
      { y: 37, count: 183 },
      { y: 60, count: 186 },
      { y: 83, count: 177 },
    ]
    for (const row of rows) {
      for (let i = 0; i < row.count; i++) {
        const x = ((i + 0.5) * 2048) / row.count
        ctx.fillStyle = '#5d5c59'
        ctx.beginPath()
        ctx.ellipse(x, row.y, 2.6, 9, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.55)'
        ctx.beginPath()
        ctx.ellipse(x - 0.7, row.y - 3, 1, 3.4, 0, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  })
}

/** The turntable's shadow on the page: soft, and darkest under the feet. */
export function pageShadowTexture() {
  return canvasTexture(256, 256, (ctx) => {
    // The shadow of a shape drawn off the canvas, so only the blur lands (canvas filters aren't in every browser).
    ctx.shadowColor = 'rgba(0,0,0,0.85)'
    ctx.shadowBlur = 26
    ctx.shadowOffsetX = 1000
    ctx.fillStyle = '#000'
    ctx.fillRect(40 - 1000, 52, 176, 152)
    ctx.shadowBlur = 10
    ctx.shadowColor = 'rgba(0,0,0,0.5)'
    ctx.fillRect(52 - 1000, 64, 152, 128)
  })
}
