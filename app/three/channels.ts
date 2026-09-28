import { palette } from '../brand/brand'
import { clockTime, pad2, posterDate } from '../lib/format'

/*
 * Casa TV's channels, from the concept deck's "large, still-functional old TV on stage". Each channel is drawn
 * into a 4:3 canvas with the brand's fonts and marks; the 3D set's CRT shader (and the 2D fallback) show it.
 */

export interface TvData {
  next: { title: string; startsAt: string; closes: string; lineup: string[] } | null
  vinylNext: { startsAt: string } | null
  rules: string[]
  venue: string
}

export const CHANNELS = [
  { id: 'next', name: 'Next up', light: palette.orange },
  { id: 'lineup', name: 'Line-up', light: '#6b4a35' },
  { id: 'rules', name: 'House rules', light: palette.cream },
  { id: 'vinyl', name: 'Vinyl nights', light: palette.pink },
  { id: 'test', name: 'Test card', light: '#f0d9c0' },
] as const

export type ChannelId = (typeof CHANNELS)[number]['id']

export const SCREEN = { width: 1024, height: 768 }

const HAND = '700 {size}px Kalam, "Marker Felt", cursive'
const BOLD = '700 {size}px "Helvetica Neue", Helvetica, Arimo, Arial, sans-serif'
const MONO = '400 {size}px "Roboto Mono", ui-monospace, monospace'
const font = (template: string, size: number) => template.replace('{size}', String(size))

/** What each channel says, for screen readers and the channel caption. */
export function channelDescription(id: ChannelId, data: TvData) {
  switch (id) {
    case 'next':
      return data.next
        ? `${data.next.title}: ${posterDate(data.next.startsAt)}, ${clockTime(data.next.startsAt)} until ${data.next.closes.toLowerCase()}, ${data.venue}.`
        : 'New nights soon.'
    case 'lineup':
      return data.next?.lineup.length ? `Line-up: ${data.next.lineup.join(', ')}.` : 'Line-up soon.'
    case 'rules':
      return `House rules: ${data.rules.join(' ')}`
    case 'vinyl':
      return data.vinylNext
        ? `All vinyl, once a month. Next vinyl night: ${posterDate(data.vinylNext.startsAt)}.`
        : 'All vinyl, once a month.'
    case 'test':
      return 'Test card. Please stand by.'
  }
}

export interface TvAssets {
  logo: HTMLImageElement
  submark: HTMLImageElement
  check: HTMLImageElement
}

function loadImage(src: string) {
  const image = new Image()
  image.crossOrigin = 'anonymous'
  image.src = src
  return image.decode().then(() => image)
}

let assets: Promise<TvAssets> | undefined

/** The brand marks and fonts the channels draw with, loaded once. */
export function loadTvAssets() {
  assets ??= Promise.all([
    loadImage('/brand/logo.svg'),
    loadImage('/brand/submark.svg'),
    loadImage('/brand/check.svg'),
    document.fonts.load(font(HAND, 40)),
    document.fonts.load(font(BOLD, 40)),
    document.fonts.load(font(MONO, 20)),
  ]).then(([logo, submark, check]) => ({ logo, submark, check }))
  return assets
}

const tints = new Map<string, HTMLCanvasElement>()

/** A brand mark recoloured (the SVGs are drawn in charcoal), cached per colour and size. */
export function tinted(image: HTMLImageElement, color: string, width: number) {
  const height = Math.round((width * image.naturalHeight) / image.naturalWidth)
  const key = `${image.src}|${color}|${width}`
  let canvas = tints.get(key)
  if (!canvas) {
    canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(image, 0, 0, width, height)
      ctx.globalCompositeOperation = 'source-in'
      ctx.fillStyle = color
      ctx.fillRect(0, 0, width, height)
    }
    tints.set(key, canvas)
  }
  return canvas
}

function centred(ctx: CanvasRenderingContext2D, text: string, y: number, style: string, color: string) {
  ctx.font = style
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, SCREEN.width / 2, y)
}

function countdown(to: number, now: number) {
  const seconds = Math.max(0, Math.floor((to - now) / 1000))
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${pad2(d)}D ${pad2(h)}H ${pad2(m)}M ${pad2(s)}S`
}

/** Splits text into lines no wider than `width` at the current font. */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width > width && line) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines
}

type Painter = (ctx: CanvasRenderingContext2D, data: TvData, time: number, now: number, assets: TvAssets) => void

const INDENTS = [0, 2.6, 0.5, 3.5, 1.3, 0, 2.1, 0, 2.8, 5.4, 0.7]

const painters: Record<ChannelId, Painter> = {
  next(ctx, data, time, now, { logo, submark }) {
    const { width, height } = SCREEN
    ctx.fillStyle = palette.orange
    ctx.fillRect(0, 0, width, height)
    // The poster's tone-on-tone wall, drifting.
    const tile = tinted(logo, '#D23A1B', 360)
    ctx.globalAlpha = 0.4
    for (let row = 0; row < 11; row++) {
      const drift = ((time * 14 * (row % 2 ? 1 : -1)) % (tile.width + 40)) - (row % 2) * 200
      for (let x = drift - tile.width - 40; x < width; x += tile.width + 40) ctx.drawImage(tile, x, row * 74 - 20)
    }
    ctx.globalAlpha = 1

    ctx.drawImage(tinted(logo, palette.cream, 760), 132, 84)
    if (!data.next) {
      centred(ctx, 'NEW NIGHTS SOON', 420, font(HAND, 96), palette.cream)
      return
    }
    centred(ctx, data.next.title.toUpperCase(), 296, font(BOLD, 40), palette.cream)
    centred(ctx, posterDate(data.next.startsAt).toUpperCase(), 390, font(HAND, 104), palette.cream)
    centred(
      ctx,
      `${clockTime(data.next.startsAt)}–${data.next.closes.toUpperCase()} · ${data.venue.toUpperCase()}`,
      484,
      font(BOLD, 36),
      palette.cream,
    )
    ctx.fillStyle = palette.charcoal
    ctx.fillRect(width / 2 - 330, 530, 660, 62)
    centred(ctx, `DOORS IN ${countdown(Date.parse(data.next.startsAt), now)}`, 562, font(MONO, 34), palette.cream)
    ctx.drawImage(tinted(submark, palette.cream, 96), width / 2 - 48, 624)
  },

  lineup(ctx, data, time) {
    const { width, height } = SCREEN
    ctx.fillStyle = palette.charcoal
    ctx.fillRect(0, 0, width, height)
    const names = data.next?.lineup.length ? data.next.lineup : ['Line-up soon']
    const gap = 82
    const loop = Math.max(names.length * gap, height - 200)
    const offset = (time * 38) % loop
    ctx.font = font(BOLD, 56)
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    // Rolling credits, repeated so the roll never runs dry.
    for (let pass = 0; pass < 3; pass++) {
      names.forEach((name, i) => {
        const y = 250 + i * gap + pass * loop - offset
        if (y < 170 || y > height - 20) return
        const fade = Math.min(1, (y - 170) / 70, (height - 20 - y) / 70)
        ctx.globalAlpha = Math.max(0, fade)
        ctx.fillStyle = palette.cream
        ctx.fillText(name.toUpperCase(), 190 + INDENTS[i % INDENTS.length] * 26, y)
      })
    }
    ctx.globalAlpha = 1
    ctx.fillStyle = palette.charcoal
    ctx.fillRect(0, 0, width, 170)
    centred(ctx, 'LINE-UP', 92, font(HAND, 84), palette.orange)
    if (data.next) centred(ctx, posterDate(data.next.startsAt).toUpperCase(), 150, font(BOLD, 26), palette.cream)
  },

  rules(ctx, data, _time, _now, { check }) {
    const { width, height } = SCREEN
    ctx.fillStyle = palette.cream
    ctx.fillRect(0, 0, width, height)
    // Paper tooth.
    ctx.fillStyle = 'rgba(33,33,33,0.05)'
    for (let i = 0; i < 1400; i++) ctx.fillRect((i * 97.13) % width, (i * 53.71) % height, 2, 2)

    ctx.font = font(HAND, 78)
    ctx.fillStyle = palette.orange
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText('HOUSE RULES', 84, 128)
    ctx.strokeStyle = palette.orange
    ctx.lineWidth = 6
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(86, 150)
    ctx.bezierCurveTo(240, 138, 380, 162, 560, 146)
    ctx.stroke()

    ctx.font = font(HAND, 38)
    ctx.fillStyle = palette.charcoal
    const tick = tinted(check, palette.orange, 44)
    let y = 222
    for (const rule of data.rules) {
      const lines = wrap(ctx, rule, 780)
      ctx.drawImage(tick, 84, y - 34)
      lines.forEach((line, i) => ctx.fillText(line, 150, y + i * 46))
      y += lines.length * 46 + 28
    }
  },

  vinyl(ctx, data, time, _now, { submark }) {
    const { width, height } = SCREEN
    ctx.fillStyle = palette.pink
    ctx.fillRect(0, 0, width, height)
    // A record spinning at a lazy, readable speed.
    const cx = 318
    const cy = 400
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(time * 0.9)
    ctx.fillStyle = '#0d0c0d'
    ctx.beginPath()
    ctx.arc(0, 0, 250, 0, Math.PI * 2)
    ctx.fill()
    for (let r = 96; r < 246; r += 7) {
      ctx.strokeStyle = `rgba(255,255,255,${0.03 + ((r * 13) % 7) * 0.008})`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(0, 0, r, 0, Math.PI * 2)
      ctx.stroke()
    }
    // A sheen that turns with the record.
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'
    ctx.lineWidth = 60
    ctx.beginPath()
    ctx.arc(0, 0, 170, -0.5, 0.1)
    ctx.stroke()
    ctx.fillStyle = palette.orange
    ctx.beginPath()
    ctx.arc(0, 0, 86, 0, Math.PI * 2)
    ctx.fill()
    ctx.drawImage(tinted(submark, palette.cream, 96), -48, -41)
    ctx.restore()

    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = palette.cream
    ctx.font = font(HAND, 120)
    ctx.fillText('ALL', 610, 320)
    ctx.fillText('VINYL', 610, 430)
    ctx.font = font(BOLD, 36)
    ctx.fillText('ONCE A MONTH', 614, 494)
    if (data.vinylNext) {
      ctx.font = font(MONO, 30)
      ctx.fillText(`NEXT: ${posterDate(data.vinylNext.startsAt).toUpperCase()}`, 614, 548)
    }
  },

  test(ctx, _data, time, _now, { submark }) {
    const { width, height } = SCREEN
    // Colour bars in the brand palette, a nod to the old test cards.
    const bars = [palette.cream, palette.stone, palette.orange, palette.red, palette.pink, palette.green, palette.charcoal]
    const barWidth = width / bars.length
    bars.forEach((color, i) => {
      ctx.fillStyle = color
      ctx.fillRect(i * barWidth, 0, barWidth + 1, height * 0.68)
    })
    const steps = ['#EDE1D3', '#C9BCAE', '#9E9186', '#72675F', '#4A423D', '#212121']
    steps.forEach((color, i) => {
      ctx.fillStyle = color
      ctx.fillRect((i * width) / steps.length, height * 0.68, width / steps.length + 1, height * 0.14)
    })
    ctx.fillStyle = palette.charcoal
    ctx.fillRect(0, height * 0.82, width, height * 0.18)

    ctx.strokeStyle = palette.cream
    ctx.lineWidth = 8
    ctx.beginPath()
    ctx.arc(width / 2, 300, 210, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = palette.charcoal
    ctx.beginPath()
    ctx.arc(width / 2, 300, 160, 0, Math.PI * 2)
    ctx.fill()
    ctx.drawImage(tinted(submark, palette.orange, 110), width / 2 - 55, 206)
    centred(ctx, 'CASA TV', 360, font(HAND, 58), palette.cream)
    // A slow blink, well under once a second: this is a "stand by", not a strobe.
    const blink = Math.sin(time * 1.6) > -0.6 ? 1 : 0.35
    ctx.globalAlpha = blink
    centred(ctx, 'PLEASE STAND BY', height * 0.91, font(MONO, 30), palette.cream)
    ctx.globalAlpha = 1
  },
}

/** Draws a channel, with the on-screen channel number while `osd` (0–1) is showing. */
export function drawChannel(
  ctx: CanvasRenderingContext2D,
  index: number,
  data: TvData,
  time: number,
  now: number,
  loaded: TvAssets,
  osd: number,
) {
  const channel = CHANNELS[index]
  ctx.save()
  painters[channel.id](ctx, data, time, now, loaded)
  ctx.restore()
  if (osd > 0) {
    ctx.save()
    ctx.globalAlpha = Math.min(1, osd)
    ctx.font = font(MONO, 50)
    ctx.textAlign = 'right'
    ctx.textBaseline = 'top'
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    ctx.fillText(`CH ${pad2(index + 1)}`, SCREEN.width - 58, 52)
    ctx.fillStyle = '#9CFF7A'
    ctx.fillText(`CH ${pad2(index + 1)}`, SCREEN.width - 62, 48)
    ctx.font = font(MONO, 22)
    ctx.fillText(channel.name.toUpperCase(), SCREEN.width - 62, 108)
    ctx.restore()
  }
}
