import { brand, palette } from '../brand/brand'
import type { Mix } from '../content/types'
import { casaSound } from '../lib/casaSound'
import { clockTime, pad2, posterDate } from '../lib/format'
import { nightPhase, onNow } from '../lib/nightOf'

/*
 * Casa TV's channels, from the concept deck's "large, still-functional old TV on stage". Each channel is drawn
 * into a 4:3 canvas with the brand's fonts and marks; the 3D set's CRT shader (and the 2D fallback) show it.
 * Casa Cam is the exception: in the 3D room the canvas carries only its overlay, over a live picture of the room.
 * On the night itself, "Next up" becomes "On now", from the set times.
 */

export interface TvData {
  next: {
    title: string
    startsAt: string
    closes: string
    /** The line-up in billing order; null for a name that's still under wraps. */
    acts: (string | null)[]
    /** The running order; a name is null until it's announced. */
    sets: { start: string; name: string | null }[]
  } | null
  vinylNext: { startsAt: string } | null
  rules: string[]
  venue: string
  /** When the page was rendered, so the first render in the browser matches the server's. */
  now: number
  /** Added to the clock, so a previewed time (`?now=…`) carries on into the TV. */
  offset: number
}

export const CHANNELS = [
  { id: 'next', name: 'Next up', light: palette.orange },
  { id: 'lineup', name: 'Line-up', light: '#6b4a35' },
  { id: 'rules', name: 'House rules', light: palette.cream },
  { id: 'vinyl', name: 'Vinyl nights', light: palette.pink },
  { id: 'test', name: 'Test card', light: '#f0d9c0' },
  { id: 'cam', name: 'Casa Cam', light: '#a9c7ba' },
] as const

export type ChannelId = (typeof CHANNELS)[number]['id']

export const SCREEN = { width: 1024, height: 768 }

const HAND = '700 {size}px Kalam, "Marker Felt", cursive'
const BOLD = '700 {size}px "Helvetica Neue", Helvetica, Arimo, Arial, sans-serif'
const MONO = '400 {size}px "Roboto Mono", ui-monospace, monospace'
const font = (template: string, size: number) => template.replace('{size}', String(size))

/** Whether the next night is on right now, and if so who's playing and who's next. */
function liveSets(data: TvData, now: number) {
  const night = data.next
  return night && nightPhase(night.startsAt, now) === 'live' ? onNow(night.sets, now) : null
}

/** What each channel says, for screen readers and the channel caption. `onAir` is Casa Radio's mix, if playing. */
export function channelDescription(id: ChannelId, data: TvData, now: number, onAir: Mix | null) {
  switch (id) {
    case 'next': {
      const night = data.next
      if (!night) return 'New nights soon.'
      const live = liveSets(data, now)
      if (live) {
        const playing = live.current ? `On now: ${live.current.name ?? 'a special guest'}.` : 'Doors are open.'
        const after = live.next ? ` Next: ${live.next.name ?? 'to be revealed'}, ${clockTime(live.next.start)}.` : ''
        return `${night.title}, tonight at ${data.venue}. ${playing}${after}`
      }
      return `${night.title}: ${posterDate(night.startsAt)}, ${clockTime(night.startsAt)} until ${night.closes.toLowerCase()}, ${data.venue}.`
    }
    case 'lineup': {
      const acts = data.next?.acts ?? []
      if (!acts.length) return 'Line-up soon.'
      const names = acts.filter((act): act is string => act !== null)
      const hidden = acts.length - names.length
      const secret = `${hidden === 1 ? 'one name' : `${hidden} names`} still to be announced`
      if (!names.length) return `Line-up: ${secret}.`
      return `Line-up: ${names.join(', ')}${hidden ? `, and ${secret}` : ''}.`
    }
    case 'rules':
      return `House rules: ${data.rules.join(' ')}`
    case 'vinyl': {
      const nights = data.vinylNext
        ? `All vinyl, once a month. Next vinyl night: ${posterDate(data.vinylNext.startsAt)}.`
        : 'All vinyl, once a month.'
      return onAir ? `${nights} On Casa Radio now: ${onAir.title}, ${onAir.artist}.` : nights
    }
    case 'test':
      return 'Test card. Please stand by.'
    case 'cam':
      return 'Casa Cam: this room, live from the camera in the ceiling.'
  }
}

export interface TvAssets {
  logo: HTMLImageElement
  submark: HTMLImageElement
  check: HTMLImageElement
}

// The marks' drawn proportions. Browsers disagree on the natural size of an SVG (Firefox has reported 0×0 and
// Safari a default 300×150 box when a file has no width and height), so drawing never relies on it.
const MARK_SIZES: Record<string, [number, number]> = {
  logo: [1600, 240],
  submark: [676, 572],
  check: [560, 440],
}

/** Resolves once the image has loaded or failed; a failed image is drawn as nothing rather than stopping the TV. */
function loadImage(src: string) {
  const image = new Image()
  image.crossOrigin = 'anonymous'
  const loaded = new Promise<HTMLImageElement>((resolve) => {
    image.onload = () => resolve(image)
    image.onerror = () => {
      console.warn(`Casa TV could not load ${src}.`)
      resolve(image)
    }
  })
  image.src = src
  return loaded
}

/** Waits for a font, but never for more than a few seconds or past an error: the TV falls back to system type. */
function loadFont(style: string) {
  return Promise.race([
    document.fonts.load(style).catch(() => []),
    new Promise((resolve) => window.setTimeout(resolve, 3000)),
  ])
}

let assets: Promise<TvAssets> | undefined

/** The brand marks and fonts the channels draw with, loaded once. Always resolves. */
export function loadTvAssets() {
  assets ??= Promise.all([
    loadImage('/brand/logo.svg'),
    loadImage('/brand/submark.svg'),
    loadImage('/brand/check.svg'),
    loadFont(font(HAND, 40)),
    loadFont(font(BOLD, 40)),
    loadFont(font(MONO, 20)),
  ]).then(([logo, submark, check]) => ({ logo, submark, check }))
  return assets
}

const tints = new Map<string, HTMLCanvasElement>()

/**
 * A brand mark recoloured (the SVGs are drawn in charcoal), cached per colour and size. A mark that failed to load
 * comes back as an empty 1×1 canvas, which is safe to draw.
 */
export function tinted(image: HTMLImageElement, color: string, width: number) {
  const name = image.src.match(/\/([\w-]+)\.svg/)?.[1] ?? ''
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

function centred(ctx: CanvasRenderingContext2D, text: string, y: number, style: string, color: string) {
  ctx.font = style
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, SCREEN.width / 2, y)
}

/** Centred text, set smaller if it would be wider than `max`. */
function fitted(ctx: CanvasRenderingContext2D, text: string, y: number, template: string, size: number, max: number) {
  ctx.font = font(template, size)
  const width = ctx.measureText(text).width
  centred(ctx, text, y, font(template, width > max ? Math.floor((size * max) / width) : size), palette.cream)
}

/** A name still under wraps: a marker stroke blacked over it, as on the site's line-ups. */
function redaction(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, tilt: number) {
  const r = 21
  ctx.save()
  ctx.translate(x + width / 2, y)
  ctx.rotate(tilt)
  ctx.beginPath()
  ctx.arc(width / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2)
  ctx.arc(-width / 2 + r, 0, r, Math.PI / 2, Math.PI * 1.5)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

const REDACTIONS = [380, 280, 440, 240, 340]

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

type Painter = (
  ctx: CanvasRenderingContext2D,
  data: TvData,
  time: number,
  now: number,
  assets: TvAssets,
  /** True when the 3D set has a live camera picture to show under the canvas. */
  live: boolean,
) => void

const INDENTS = [0, 2.6, 0.5, 3.5, 1.3, 0, 2.1, 0, 2.8, 5.4, 0.7]

const cctvClock = new Intl.DateTimeFormat(brand.locale, {
  timeZone: brand.timeZone,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})
let stamp = { second: -1, text: '' }

/** "28/09/2026  21:04:07" in St Kilda, formatted once a second. */
function cctvTime(now: number) {
  const second = Math.floor(now / 1000)
  if (second !== stamp.second) stamp = { second, text: cctvClock.format(now).replace(', ', '  ') }
  return stamp.text
}

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
    const live = liveSets(data, now)
    if (live) {
      // On the night: who's on now and who's next, under a slow red "on air" light.
      centred(ctx, 'ON NOW', 296, font(BOLD, 40), palette.cream)
      const label = ctx.measureText('ON NOW').width
      ctx.fillStyle = Math.sin(time * 2.4) > -0.4 ? '#ff3b2f' : '#8f2a1c'
      ctx.beginPath()
      ctx.arc(width / 2 - label / 2 - 32, 294, 12, 0, Math.PI * 2)
      ctx.fill()
      const playing = live.current ? (live.current.name ?? 'Special guest') : 'Doors open'
      fitted(ctx, playing.toUpperCase(), 390, HAND, 104, 860)
      const after = live.next
        ? `NEXT: ${(live.next.name ?? 'To be revealed').toUpperCase()} · ${clockTime(live.next.start)}`
        : `ON TILL ${data.next.closes.toUpperCase()}`
      fitted(ctx, after, 484, BOLD, 36, 860)
      ctx.fillStyle = palette.charcoal
      ctx.fillRect(width / 2 - 330, 530, 660, 62)
      // The camera clock's time of day, HH:MM:SS.
      centred(ctx, `LIVE · ${cctvTime(now).slice(-8)}`, 562, font(MONO, 34), palette.cream)
      ctx.drawImage(tinted(submark, palette.cream, 96), width / 2 - 48, 624)
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
    const acts = data.next?.acts.length ? data.next.acts : ['Line-up soon']
    const hidden = acts.filter((act) => act === null).length
    const gap = 82
    const loop = Math.max(acts.length * gap, height - 200)
    const offset = (time * 38) % loop
    ctx.font = font(BOLD, 56)
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = palette.cream
    // Rolling credits, repeated so the roll never runs dry. Names still under wraps roll by blacked out.
    for (let pass = 0; pass < 3; pass++) {
      let secret = 0
      acts.forEach((act, i) => {
        const y = 250 + i * gap + pass * loop - offset
        const x = 190 + INDENTS[i % INDENTS.length] * 26
        if (act === null) secret += 1
        if (y < 170 || y > height - 20) return
        ctx.globalAlpha = Math.max(0, Math.min(1, (y - 170) / 70, (height - 20 - y) / 70))
        if (act === null) redaction(ctx, x, y, REDACTIONS[(secret - 1) % REDACTIONS.length], secret % 2 ? -0.02 : 0.015)
        else ctx.fillText(act.toUpperCase(), x, y)
      })
    }
    ctx.globalAlpha = 1
    ctx.fillStyle = palette.charcoal
    ctx.fillRect(0, 0, width, 170)
    centred(ctx, 'LINE-UP', 92, font(HAND, 84), palette.orange)
    if (data.next) {
      const more = hidden ? ` · ${hidden === 1 ? 'ONE MORE NAME' : `${hidden} MORE NAMES`} SOON` : ''
      centred(ctx, `${posterDate(data.next.startsAt).toUpperCase()}${more}`, 150, font(BOLD, 26), palette.cream)
    }
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

    // While Casa Radio plays, a lit "on air" sign and what's on.
    const onAir = casaSound.onAir()
    if (!onAir) return
    ctx.save()
    ctx.shadowColor = 'rgba(255, 70, 40, 0.9)'
    ctx.shadowBlur = 28
    ctx.fillStyle = '#e0301e'
    ctx.fillRect(614, 146, 204, 66)
    ctx.restore()
    ctx.font = font(BOLD, 38)
    ctx.textBaseline = 'middle'
    ctx.fillText('ON AIR', 640, 181)
    ctx.textBaseline = 'alphabetic'
    ctx.font = font(MONO, 26)
    for (const [i, line] of [onAir.title, onAir.artist].entries()) {
      const text = line.toUpperCase()
      const fit = Math.min(1, 370 / Math.max(1, ctx.measureText(text).width))
      ctx.save()
      ctx.translate(614, 612 + i * 38)
      ctx.scale(fit, 1)
      ctx.fillText(text, 0, 0)
      ctx.restore()
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

  cam(ctx, _data, time, now, _assets, live) {
    const { width, height } = SCREEN
    if (live) {
      // The 3D set shows the camera's picture through the clear canvas.
      ctx.clearRect(0, 0, width, height)
    } else {
      ctx.fillStyle = '#161c19'
      ctx.fillRect(0, 0, width, height)
      let seed = Math.floor(time * 24) * 7919 + 1
      const random = () => {
        seed = (seed * 16807) % 2147483647
        return seed / 2147483647
      }
      for (let i = 0; i < 1400; i++) {
        ctx.fillStyle = `rgba(200, 225, 212, ${0.03 + random() * 0.12})`
        ctx.fillRect(random() * width, random() * height, 2 + random() * 4, 2)
      }
      centred(ctx, 'NO SIGNAL', height / 2, font(MONO, 44), '#d6e8de')
    }

    // A security camera's captions, with a shadow so they read over any picture.
    ctx.save()
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)'
    ctx.shadowOffsetX = 2
    ctx.shadowOffsetY = 2
    ctx.font = font(MONO, 30)
    ctx.fillStyle = '#eef6f1'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText('REC  CAM 01', 104, 52)
    ctx.textBaseline = 'bottom'
    ctx.fillText(cctvTime(now), 62, height - 52)
    ctx.textAlign = 'right'
    ctx.fillText('ST KILDA', width - 62, height - 52)
    // The recording light blinks slowly.
    if (Math.floor(time * 1.2) % 2 === 0) {
      ctx.fillStyle = '#ff3b2f'
      ctx.beginPath()
      ctx.arc(80, 69, 11, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  },
}

/**
 * Draws a channel, with the on-screen channel number while `osd` (0–1) is showing. `live` is for the 3D set, which
 * has a camera picture to put under Casa Cam's captions; anywhere else that channel shows "no signal".
 */
export function drawChannel(
  ctx: CanvasRenderingContext2D,
  index: number,
  data: TvData,
  time: number,
  now: number,
  loaded: TvAssets,
  osd: number,
  live = false,
) {
  const channel = CHANNELS[index]
  ctx.save()
  painters[channel.id](ctx, data, time, now, loaded, live)
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
