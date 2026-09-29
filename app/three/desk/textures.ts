import { moods, palette, type MoodId } from '../../brand/brand'
import type { Mix } from '../../content/types'
import { tinted, type TvAssets } from '../channels'
import { canvasTexture } from '../room/textures'

/*
 * The DJ desk's printed and painted surfaces, drawn into canvases at load like the rest of the 3D: record sleeves,
 * the mixer's faceplate, the crate's pine and the neon sign's glow. Colour textures are sRGB; data maps stay linear.
 */

/** A repeatable pseudo-random sequence, so textures come out the same every time. */
function seeded(seed: number) {
  let value = seed
  return () => {
    value = (value * 16807) % 2147483647
    return value / 2147483647
  }
}

/**
 * A record sleeve in one of the brand's colourways: the wordmark wall in miniature, the title in marker and the
 * submark, with ring wear where the record has rubbed the card. The top two thirds carry the art, since the
 * crate's front wall hides the bottom.
 */
export function sleeveTexture(title: string, subtitle: string, mood: MoodId, assets: TvAssets | null, seed = 1) {
  const colours = moods[mood]
  return canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = colours.base
    ctx.fillRect(0, 0, 512, 512)
    if (assets) {
      const wall = tinted(assets.logo, colours.pattern, 230)
      ctx.globalAlpha = mood === 'cream' ? 0.35 : 0.9
      for (let row = 0; row < 14; row++) {
        const offset = (row % 2) * -110 - 20
        for (let x = offset; x < 512; x += 250) ctx.drawImage(wall, x, row * 38 - 8)
      }
      ctx.globalAlpha = 1
    }
    // Ring wear.
    ctx.strokeStyle = mood === 'cream' ? 'rgba(33,33,33,0.1)' : 'rgba(255,240,220,0.13)'
    ctx.lineWidth = 12
    ctx.beginPath()
    ctx.arc(256, 256, 214, 0, Math.PI * 2)
    ctx.stroke()
    // A band for the title, so it reads over the pattern.
    ctx.fillStyle = colours.base
    ctx.fillRect(28, 34, 456, 150)
    ctx.fillStyle = colours.ink
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    let size = 76
    ctx.font = `700 ${size}px Kalam, "Marker Felt", cursive`
    while (ctx.measureText(title.toUpperCase()).width > 430 && size > 40) {
      size -= 4
      ctx.font = `700 ${size}px Kalam, "Marker Felt", cursive`
    }
    ctx.fillText(title.toUpperCase(), 44, 118)
    ctx.font = '500 22px "Roboto Mono", ui-monospace, monospace'
    ctx.fillText(subtitle.toUpperCase(), 48, 160)
    if (assets) ctx.drawImage(tinted(assets.submark, colours.ink, 78), 406, 214)
    ctx.font = '500 16px "Roboto Mono", ui-monospace, monospace'
    ctx.fillText('CASA RECORDS', 48, 470)
    // Card grain.
    const random = seeded(seed * 97 + 13)
    for (let i = 0; i < 2200; i++) {
      ctx.fillStyle = random() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'
      ctx.fillRect(random() * 512, random() * 512, 2, 2)
    }
  })
}

/** The sleeve for a mix in the crate. */
export function mixSleeveTexture(mix: Mix, assets: TvAssets | null, seed: number) {
  return sleeveTexture(mix.title, mix.artist, mix.sleeve ?? 'orange', assets, seed)
}

/** The back of a sleeve, and the ones at the back of the crate: plain card, printed small. */
export function sleeveBackTexture(mood: MoodId) {
  const colours = moods[mood]
  return canvasTexture(128, 128, (ctx) => {
    ctx.fillStyle = colours.base
    ctx.fillRect(0, 0, 128, 128)
    ctx.fillStyle = colours.ink
    ctx.globalAlpha = 0.5
    for (let y = 30; y < 110; y += 9) ctx.fillRect(14, y, 40 + ((y * 7) % 50), 2)
    ctx.globalAlpha = 1
  })
}

/** Knotty pine for the crate's boards. */
export function pineTexture() {
  const random = seeded(23)
  return canvasTexture(512, 128, (ctx) => {
    ctx.fillStyle = '#c99a62'
    ctx.fillRect(0, 0, 512, 128)
    for (let i = 0; i < 70; i++) {
      const y = random() * 128
      ctx.strokeStyle = `rgba(${120 + random() * 40},${70 + random() * 30},${30 + random() * 20},${0.12 + random() * 0.2})`
      ctx.lineWidth = 0.6 + random() * 1.8
      ctx.beginPath()
      ctx.moveTo(0, y)
      for (let x = 0; x <= 512; x += 32) ctx.lineTo(x, y + Math.sin(x * 0.012 + i) * (2 + random() * 3))
      ctx.stroke()
    }
    for (let k = 0; k < 3; k++) {
      const x = 60 + random() * 400
      const y = 20 + random() * 88
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, 9)
      gradient.addColorStop(0, 'rgba(90,50,20,0.8)')
      gradient.addColorStop(1, 'rgba(120,70,30,0)')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.ellipse(x, y, 16, 8, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  })
}

/**
 * The mixer's faceplate, seen from above with the front of the mixer at the bottom: two channel strips with their
 * EQ legends and fader scales, the meter window in the middle and the crossfader's slot.
 */
export function faceplateTexture() {
  return canvasTexture(512, 614, (ctx) => {
    ctx.fillStyle = '#1b1b1e'
    ctx.fillRect(0, 0, 512, 614)
    const random = seeded(31)
    for (let y = 0; y < 614; y++) {
      ctx.fillStyle = `rgba(255,255,255,${random() * 0.025})`
      ctx.fillRect(0, y, 512, 1)
    }
    ctx.strokeStyle = 'rgba(237,225,211,0.25)'
    ctx.lineWidth = 2
    ctx.strokeRect(10, 10, 492, 594)
    ctx.fillStyle = 'rgba(237,225,211,0.8)'
    ctx.font = '500 15px "Roboto Mono", ui-monospace, monospace'
    ctx.textAlign = 'center'
    for (const [x, name] of [
      [128, 'CH 1'],
      [384, 'CH 2'],
    ] as const) {
      ctx.fillText(name, x, 40)
      for (const [y, label] of [
        [110, 'GAIN'],
        [178, 'HI'],
        [238, 'MID'],
        [298, 'LOW'],
      ] as const) {
        ctx.fillText(label, x, y)
      }
      // The fader's scale.
      for (let i = 0; i <= 10; i++) {
        const y = 360 + i * 14
        ctx.fillRect(x - 30, y, i % 5 === 0 ? 14 : 8, 2)
      }
      ctx.fillStyle = '#060607'
      ctx.fillRect(x - 5, 356, 10, 148)
      ctx.fillStyle = 'rgba(237,225,211,0.8)'
    }
    ctx.fillText('CASA · 2CH', 256, 40)
    ctx.fillStyle = '#060607'
    ctx.fillRect(226, 80, 60, 216)
    ctx.fillRect(166, 560, 180, 10)
    ctx.fillStyle = palette.orange
    ctx.fillRect(236, 316, 40, 3)
    ctx.fillStyle = 'rgba(237,225,211,0.8)'
    ctx.fillText('A', 150, 590)
    ctx.fillText('B', 362, 590)
  })
}

/** A knob's cap: black with a white pointer line from the centre to the rim. */
export function knobCapTexture() {
  return canvasTexture(64, 64, (ctx) => {
    ctx.fillStyle = '#141416'
    ctx.fillRect(0, 0, 64, 64)
    ctx.fillStyle = '#efe6da'
    ctx.fillRect(30, 4, 4, 26)
  })
}

/**
 * The neon sign's halo: the wordmark blurred into a soft glow (by drawing its shadow, which every browser blurs),
 * for an additive plane behind the tubes.
 */
export function neonGlowTexture(assets: TvAssets) {
  return canvasTexture(1024, 256, (ctx) => {
    const logo = tinted(assets.logo, '#ffffff', 800)
    ctx.shadowColor = '#ffffff'
    ctx.shadowBlur = 40
    ctx.shadowOffsetX = 2000
    ctx.drawImage(logo, 112 - 2000, (256 - logo.height) / 2)
    ctx.shadowBlur = 14
    ctx.drawImage(logo, 112 - 2000, (256 - logo.height) / 2)
  })
}

/** The neon tubes themselves: the wordmark, bright, on a transparent ground. */
export function neonTubeTexture(assets: TvAssets) {
  return canvasTexture(1024, 256, (ctx) => {
    const logo = tinted(assets.logo, '#ffffff', 800)
    ctx.drawImage(logo, 112, (256 - logo.height) / 2)
  })
}
