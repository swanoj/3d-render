import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'
import { palette } from '../../brand/brand'
import { tinted, type TvAssets } from '../channels'

/*
 * Every surface in the room is painted into a canvas at load, so the scene needs no image files. Colour textures
 * are tagged sRGB; bump maps stay linear.
 */

export function canvasTexture(
  width: number,
  height: number,
  paint: (ctx: CanvasRenderingContext2D) => void,
  colour = true,
) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (ctx) paint(ctx)
  const texture = new CanvasTexture(canvas)
  if (colour) texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

function tiled(texture: CanvasTexture, x: number, y: number) {
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.repeat.set(x, y)
  return texture
}

/** A repeatable pseudo-random sequence, so textures come out the same every time. */
function seeded(seed: number) {
  let value = seed
  return () => {
    value = (value * 16807) % 2147483647
    return value / 2147483647
  }
}

/** Walnut veneer: warm brown with wavy grain and the odd darker figure. */
export function walnutTexture() {
  const random = seeded(5)
  return tiled(
    canvasTexture(512, 512, (ctx) => {
      ctx.fillStyle = '#6e4027'
      ctx.fillRect(0, 0, 512, 512)
      for (let i = 0; i < 220; i++) {
        const y = random() * 512
        const dark = random() < 0.62
        ctx.strokeStyle = dark
          ? `rgba(38,18,8,${0.08 + random() * 0.16})`
          : `rgba(170,108,66,${0.08 + random() * 0.12})`
        ctx.lineWidth = 0.6 + random() * 3
        const phase = random() * 10
        ctx.beginPath()
        for (let x = 0; x <= 512; x += 12) {
          const wave = y + Math.sin(x * 0.011 + phase) * 7 + Math.sin(x * 0.043 + phase * 2) * 1.8
          if (x === 0) ctx.moveTo(x, wave)
          else ctx.lineTo(x, wave)
        }
        ctx.stroke()
      }
    }),
    1.3,
    1,
  )
}

/** Linen shade lit from inside: brightest at the lower rim, with the weave showing. */
export function shadeTexture() {
  return canvasTexture(256, 256, (ctx) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 256)
    gradient.addColorStop(0, '#8a4a22')
    gradient.addColorStop(0.55, '#e59a5c')
    gradient.addColorStop(1, '#ffd9a8')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 256, 256)
    for (let x = 0; x < 256; x += 3) {
      ctx.fillStyle = `rgba(90,40,15,${0.05 + ((x * 7) % 5) * 0.012})`
      ctx.fillRect(x, 0, 1, 256)
    }
  })
}

export function glowTexture() {
  return canvasTexture(128, 128, (ctx) => {
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(0.35, 'rgba(255,255,255,0.35)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 128, 128)
  })
}

/** A round vintage rug: concentric bands in the brand's reds with a thin ring of cream. */
export function rugTexture() {
  const random = seeded(9)
  return canvasTexture(512, 512, (ctx) => {
    const bands = [
      [256, '#3f150d'],
      [236, '#5a2114'],
      [222, '#a07a5a'],
      [216, '#5a2114'],
      [176, '#6e2439'],
      [168, '#4d1a10'],
      [118, '#7c3018'],
      [70, '#4d1a10'],
      [30, '#94401f'],
    ] as const
    for (const [radius, colour] of bands) {
      ctx.fillStyle = colour
      ctx.beginPath()
      ctx.arc(256, 256, radius, 0, Math.PI * 2)
      ctx.fill()
    }
    // Pile: fine speckle so the bands don't read as flat paint.
    for (let i = 0; i < 14000; i++) {
      ctx.fillStyle = random() < 0.5 ? 'rgba(0,0,0,0.14)' : 'rgba(255,220,190,0.07)'
      ctx.fillRect(random() * 512, random() * 512, 2, 2)
    }
  })
}

/** Dark, varnished floorboards, each board a slightly different tone. */
export function floorTexture() {
  const random = seeded(3)
  return tiled(
    canvasTexture(512, 512, (ctx) => {
      ctx.fillStyle = '#2a1a12'
      ctx.fillRect(0, 0, 512, 512)
      for (let row = 0; row < 8; row++) {
        const y = row * 64
        let x = -random() * 300
        while (x < 512) {
          const length = 180 + random() * 260
          const tone = random()
          ctx.fillStyle = tone < 0.5 ? `rgba(0,0,0,${0.05 + tone * 0.2})` : `rgba(255,200,160,${(tone - 0.5) * 0.08})`
          ctx.fillRect(x, y, length, 64)
          // Grain along the board.
          for (let g = 0; g < 6; g++) {
            ctx.fillStyle = `rgba(0,0,0,${0.05 + random() * 0.08})`
            ctx.fillRect(x, y + 6 + random() * 52, length, 1)
          }
          ctx.fillStyle = 'rgba(0,0,0,0.55)'
          ctx.fillRect(x, y, 2, 64)
          x += length
        }
        ctx.fillStyle = 'rgba(0,0,0,0.6)'
        ctx.fillRect(0, y, 512, 2)
      }
    }),
    9,
    8,
  )
}

/** Old striped wallpaper in terracotta, with small diamonds and some age in it. */
export function wallpaperTexture(repeatX: number, repeatY: number) {
  const random = seeded(11)
  return tiled(
    canvasTexture(256, 256, (ctx) => {
      ctx.fillStyle = '#58230f'
      ctx.fillRect(0, 0, 256, 256)
      ctx.fillStyle = '#652b16'
      ctx.fillRect(0, 0, 104, 256)
      ctx.fillStyle = 'rgba(224,140,80,0.2)'
      ctx.fillRect(120, 0, 3, 256)
      ctx.fillRect(148, 0, 3, 256)
      ctx.strokeStyle = 'rgba(224,140,80,0.24)'
      ctx.lineWidth = 2
      for (let y = 0; y < 256; y += 64) {
        ctx.beginPath()
        ctx.moveTo(52, y + 14)
        ctx.lineTo(68, y + 32)
        ctx.lineTo(52, y + 50)
        ctx.lineTo(36, y + 32)
        ctx.closePath()
        ctx.stroke()
      }
      for (let i = 0; i < 2200; i++) {
        ctx.fillStyle = `rgba(0,0,0,${random() * 0.09})`
        ctx.fillRect(random() * 256, random() * 256, 3, 3)
      }
    }),
    repeatX,
    repeatY,
  )
}

/** Speaker cloth: a coarse weave with a gold thread through it. */
export function fabricTexture() {
  return tiled(
    canvasTexture(128, 128, (ctx) => {
      ctx.fillStyle = '#2a1e17'
      ctx.fillRect(0, 0, 128, 128)
      for (let i = 0; i < 128; i += 4) {
        ctx.fillStyle = 'rgba(190,150,100,0.18)'
        ctx.fillRect(i, 0, 2, 128)
        ctx.fillStyle = 'rgba(0,0,0,0.3)'
        ctx.fillRect(0, i + 2, 128, 2)
      }
      ctx.strokeStyle = 'rgba(214,176,98,0.35)'
      ctx.lineWidth = 1
      for (let i = -128; i < 128; i += 16) {
        ctx.beginPath()
        ctx.moveTo(i, 128)
        ctx.lineTo(i + 128, 0)
        ctx.stroke()
      }
    }),
    3,
    3,
  )
}

/** Ridges around a knob's edge, as a bump map. */
export function knurlTexture() {
  const texture = canvasTexture(
    128,
    8,
    (ctx) => {
      ctx.fillStyle = '#404040'
      ctx.fillRect(0, 0, 128, 8)
      ctx.fillStyle = '#ffffff'
      for (let x = 0; x < 128; x += 4) ctx.fillRect(x, 0, 2, 8)
    },
    false,
  )
  texture.wrapS = RepeatWrapping
  texture.repeat.set(2, 1)
  return texture
}

/** The channel dial: numbers clockwise from the top, where the knob's pointer lands for each channel. */
export function dialTexture(count: number) {
  return canvasTexture(256, 256, (ctx) => {
    const centre = 128
    const face = ctx.createRadialGradient(centre, centre, 60, centre, centre, 128)
    face.addColorStop(0, '#2b2019')
    face.addColorStop(1, '#17110d')
    ctx.fillStyle = face
    ctx.beginPath()
    ctx.arc(centre, centre, 127, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#b8955e'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(centre, centre, 121, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = '#ecd9b8'
    ctx.font = '500 30px "Roboto Mono", ui-monospace, monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (let i = 0; i < count; i++) {
      const angle = (i * Math.PI * 2) / count
      const sin = Math.sin(angle)
      const cos = Math.cos(angle)
      ctx.fillText(String(i + 1), centre + sin * 100, centre - cos * 100)
      ctx.fillRect(centre + sin * 78 - 2, centre - cos * 78 - 2, 4, 4)
    }
  })
}

/** A soft, uneven puff of haze in white on clear, fading out well inside its edges; sprites tint it. */
export function hazeTexture() {
  return canvasTexture(256, 256, (ctx) => {
    let seed = 11
    const random = () => {
      seed = (seed * 16807) % 2147483647
      return seed / 2147483647
    }
    for (let i = 0; i < 26; i++) {
      const angle = random() * Math.PI * 2
      const distance = random() * 60
      const x = 128 + Math.cos(angle) * distance
      const y = 128 + Math.sin(angle) * distance
      const radius = 30 + random() * 50
      const blob = ctx.createRadialGradient(x, y, 0, x, y, radius)
      blob.addColorStop(0, `rgba(255, 255, 255, ${0.1 + random() * 0.12})`)
      blob.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = blob
      ctx.fillRect(0, 0, 256, 256)
    }
    ctx.globalCompositeOperation = 'destination-in'
    const edge = ctx.createRadialGradient(128, 128, 20, 128, 128, 126)
    edge.addColorStop(0, 'rgba(255, 255, 255, 1)')
    edge.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = edge
    ctx.fillRect(0, 0, 256, 256)
  })
}

/** The maker's plate: engraved brass. */
export function badgeTexture() {
  return canvasTexture(256, 64, (ctx) => {
    const brass = ctx.createLinearGradient(0, 0, 0, 64)
    brass.addColorStop(0, '#e6c88e')
    brass.addColorStop(0.5, '#b08a4e')
    brass.addColorStop(1, '#8a6a38')
    ctx.fillStyle = brass
    ctx.fillRect(0, 0, 256, 64)
    ctx.strokeStyle = 'rgba(60,40,15,0.7)'
    ctx.lineWidth = 2
    ctx.strokeRect(5, 5, 246, 54)
    ctx.fillStyle = '#3b2a14'
    ctx.font = '700 34px Kalam, "Marker Felt", cursive'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('CASA', 128, 35)
  })
}

export function groovesTexture() {
  return canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = '#0c0c0d'
    ctx.fillRect(0, 0, 256, 256)
    for (let r = 40; r < 127; r += 2.5) {
      ctx.strokeStyle = `rgba(255,255,255,${0.025 + ((r * 7) % 5) * 0.01})`
      ctx.beginPath()
      ctx.arc(128, 128, r, 0, Math.PI * 2)
      ctx.stroke()
    }
  })
}

/** A record label: the brand colour, the submark and the speed. */
export function labelTexture(colour: string, assets: TvAssets | null) {
  return canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = colour
    ctx.beginPath()
    ctx.arc(128, 128, 128, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(237,225,211,0.45)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(128, 128, 112, 0, Math.PI * 2)
    ctx.stroke()
    if (assets) ctx.drawImage(tinted(assets.submark, palette.cream, 104), 76, 46)
    ctx.fillStyle = palette.cream
    ctx.font = '500 17px "Roboto Mono", ui-monospace, monospace'
    ctx.textAlign = 'center'
    ctx.fillText('33⅓ RPM', 128, 196)
    ctx.fillStyle = '#0b0b0c'
    ctx.beginPath()
    ctx.arc(128, 128, 7, 0, Math.PI * 2)
    ctx.fill()
  })
}

/** Front of the record sleeve that leans on the crate: the orange poster in miniature. */
export function sleeveTexture(assets: TvAssets | null) {
  return canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = palette.orange
    ctx.fillRect(0, 0, 512, 512)
    if (assets) {
      const wall = tinted(assets.logo, '#D23A1B', 240)
      for (let row = 0; row < 14; row++) {
        const offset = (row % 2) * -120
        for (let x = offset; x < 512; x += 262) ctx.drawImage(wall, x, row * 40 - 10)
      }
      ctx.drawImage(tinted(assets.logo, palette.cream, 420), 46, 150)
      ctx.drawImage(tinted(assets.submark, palette.cream, 70), 221, 330)
    }
    ctx.fillStyle = palette.cream
    ctx.font = '500 20px "Roboto Mono", ui-monospace, monospace'
    ctx.textAlign = 'center'
    ctx.fillText('CASA RECORDS · 001', 256, 460)
    // Ring wear, where the record inside has rubbed the card.
    ctx.strokeStyle = 'rgba(255,240,220,0.12)'
    ctx.lineWidth = 10
    ctx.beginPath()
    ctx.arc(256, 256, 200, 0, Math.PI * 2)
    ctx.stroke()
  })
}

/** A leaf: darker at the stem, with a pale midrib and veins. */
export function leafTexture() {
  return canvasTexture(64, 128, (ctx) => {
    const gradient = ctx.createLinearGradient(0, 128, 0, 0)
    gradient.addColorStop(0, '#34401f')
    gradient.addColorStop(1, '#71844a')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 64, 128)
    ctx.strokeStyle = 'rgba(214,222,160,0.45)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(32, 128)
    ctx.lineTo(32, 0)
    ctx.stroke()
    ctx.lineWidth = 1
    ctx.strokeStyle = 'rgba(214,222,160,0.2)'
    for (let y = 112; y > 12; y -= 12) {
      ctx.beginPath()
      ctx.moveTo(32, y)
      ctx.quadraticCurveTo(46, y - 6, 62, y - 16)
      ctx.moveTo(32, y)
      ctx.quadraticCurveTo(18, y - 6, 2, y - 16)
      ctx.stroke()
    }
  })
}
