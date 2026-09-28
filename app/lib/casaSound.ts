import { mixes } from '../content/radio'
import type { Mix } from '../content/types'
import type { ChannelId } from '../three/channels'

/** Casa Radio: the mix selected, and whether it's playing. */
export interface RadioState {
  on: boolean
  mix: Mix
}

/*
 * Casa TV's sound, made with Web Audio so there are no files to load. The club next door comes through the wall as
 * a muffled house groove, the room has its own hush, and the set makes its own noises: the knob's clunk, static
 * between channels, a crackling record on the vinyl channel (which also carries the club's music), the test card's
 * tone and the camera's hum. Nothing plays until the visitor turns the sound on, and it fades away whenever the
 * room is off screen or the tab is hidden.
 */

const TEMPO = 122
const SIXTEENTH = 60 / TEMPO / 4
const BEAT = SIXTEENTH * 4
/** How far ahead the scheduler books notes, in seconds; it wakes every 25 ms. */
const LOOKAHEAD = 0.12
/** Overall level: the groove peaks around -8 dBFS, background rather than foreground. */
const MASTER = 0.5

// A bar each of Am7, Fmaj7, Cmaj7 and G6. The bass sits an octave above sub-bass so laptop and phone speakers
// still carry it through the wall.
const PROGRESSION = [
  { bass: 110, chord: [220, 261.63, 329.63, 392] },
  { bass: 87.31, chord: [220, 261.63, 329.63, 349.23] },
  { bass: 130.81, chord: [246.94, 261.63, 329.63, 392] },
  { bass: 98, chord: [246.94, 293.66, 329.63, 392] },
]

// What each channel adds from the set's own speaker, and how loud. The tone and the hum sit where the ear is
// sensitive, so they're kept well under the groove.
const BED_LEVELS = { vinyl: 0.5, test: 0.008, cam: 0.03 }
type Bed = keyof typeof BED_LEVELS

export interface Mixer {
  ctx: BaseAudioContext
  master: GainNode
  /** Every instrument of the groove, before the wall. */
  music: GainNode
  wall: BiquadFilterNode
  wallLevel: GainNode
  /** The set's speaker. */
  tv: GainNode
  /** The club's music sent through the set as well as the wall (the vinyl channel). */
  toTv: GainNode
  /** Casa Radio playing the groove clearly. */
  radio: GainNode
  /** Casa Radio's mixes (audio files), and an ear on them for the lamps. */
  mixIn: GainNode
  listen: AnalyserNode
  /** The room's hush, only while you're in the room. */
  hushLevel: GainNode
  beds: Record<Bed, GainNode>
  noise: AudioBuffer
}

function filter(ctx: BaseAudioContext, type: BiquadFilterType, frequency: number, q: number) {
  const node = ctx.createBiquadFilter()
  node.type = type
  node.frequency.value = frequency
  node.Q.value = q
  return node
}

/** Up to `peak` in `attack` seconds, then away over `release`. */
function pluck(param: AudioParam, time: number, peak: number, attack: number, release: number) {
  param.setValueAtTime(0.0001, time)
  param.exponentialRampToValueAtTime(peak, time + attack)
  param.exponentialRampToValueAtTime(0.0001, time + attack + release)
}

function buffer(ctx: BaseAudioContext, channels: number, seconds: number, fill: (data: Float32Array) => void) {
  const audio = ctx.createBuffer(channels, Math.round(ctx.sampleRate * seconds), ctx.sampleRate)
  for (let channel = 0; channel < channels; channel++) fill(audio.getChannelData(channel))
  return audio
}

function whiteNoise(data: Float32Array) {
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
}

/** A low rumble that loops without a seam: the ends are levelled to meet. */
function brownNoise(data: Float32Array) {
  let last = 0
  for (let i = 0; i < data.length; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02
    data[i] = last * 3.5
  }
  const drift = data[data.length - 1] - data[0]
  for (let i = 0; i < data.length; i++) data[i] -= (drift * i) / data.length
}

/** Surface hiss with ticks, and now and then a proper pop. */
function crackle(data: Float32Array, sampleRate: number) {
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.012
  const pops = Math.round((data.length / sampleRate) * 14)
  for (let p = 0; p < pops; p++) {
    const at = Math.floor(Math.random() * (data.length - 64))
    const size = Math.random() < 0.08 ? 0.5 + Math.random() * 0.3 : 0.05 + Math.random() * 0.18
    const sign = Math.random() < 0.5 ? -1 : 1
    const length = 8 + Math.floor(Math.random() * 40)
    for (let i = 0; i < length; i++) data[at + i] += sign * size * Math.exp(-i / (length / 4)) * (i % 2 ? -0.6 : 1)
  }
}

/** The next room's reverb: a short burst of noise dying away. */
function roomTail(data: Float32Array) {
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 3
}

function noise(mix: Mixer) {
  const source = mix.ctx.createBufferSource()
  source.buffer = mix.noise
  return source
}

/** Builds the whole graph into `output`. Starts silent: `master` is at zero. */
export function createMixer(ctx: BaseAudioContext, output: AudioNode): Mixer {
  const master = ctx.createGain()
  master.gain.value = 0
  const glue = ctx.createDynamicsCompressor()
  glue.threshold.value = -16
  glue.knee.value = 10
  glue.ratio.value = 3
  glue.attack.value = 0.004
  glue.release.value = 0.25
  master.connect(glue).connect(output)

  // The club, through the wall: everything above the low mids is gone and the thump of the room is left.
  const music = ctx.createGain()
  const wall = filter(ctx, 'lowpass', 380, 0.9)
  const thump = filter(ctx, 'peaking', 125, 0.9)
  thump.gain.value = 5
  const wallLevel = ctx.createGain()
  wallLevel.gain.value = 0.42
  const tail = ctx.createConvolver()
  tail.buffer = buffer(ctx, 2, 1.4, roomTail)
  const tailLevel = ctx.createGain()
  tailLevel.gain.value = 0.3
  music.connect(wall).connect(thump).connect(wallLevel).connect(master)
  wallLevel.connect(tailLevel).connect(tail).connect(master)

  // The set's speaker: small and boxy, with no real bass.
  const tv = ctx.createGain()
  const speaker = filter(ctx, 'peaking', 2400, 1.2)
  speaker.gain.value = 4
  tv.connect(filter(ctx, 'highpass', 170, 0.7))
    .connect(speaker)
    .connect(filter(ctx, 'lowpass', 6500, 0.7))
    .connect(master)
  const toTv = ctx.createGain()
  toTv.gain.value = 0
  music.connect(toTv).connect(tv)

  // Casa Radio: the same groove heard clearly, as if it's playing in the room, with a little of the room's tail.
  const radio = ctx.createGain()
  radio.gain.value = 0
  music.connect(filter(ctx, 'lowpass', 7000, 0.7)).connect(radio).connect(master)
  radio.connect(tailLevel)
  // Casa Radio's mixes (audio files) come in here. The analyser lets the lamps swell with them.
  const mixIn = ctx.createGain()
  mixIn.gain.value = 0
  const listen = ctx.createAnalyser()
  listen.fftSize = 512
  listen.smoothingTimeConstant = 0.5
  mixIn.connect(master)
  mixIn.connect(listen)

  // The room's own hush.
  const hush = ctx.createBufferSource()
  hush.buffer = buffer(ctx, 2, 6, brownNoise)
  hush.loop = true
  const hushLevel = ctx.createGain()
  hushLevel.gain.value = 0
  hush.connect(filter(ctx, 'lowpass', 500, 0.7)).connect(hushLevel).connect(master)
  hush.start()

  // Each channel's bed runs all along at zero and is faded up while its channel is on.
  const record = ctx.createBufferSource()
  record.buffer = buffer(ctx, 1, 5, (data) => crackle(data, ctx.sampleRate))
  record.loop = true
  const tone = ctx.createOscillator()
  tone.frequency.value = 1000
  const hum = ctx.createOscillator()
  hum.type = 'sawtooth'
  hum.frequency.value = 50
  const beds = { vinyl: ctx.createGain(), test: ctx.createGain(), cam: ctx.createGain() }
  for (const bed of Object.values(beds)) {
    bed.gain.value = 0
    bed.connect(tv)
  }
  record.connect(beds.vinyl)
  tone.connect(beds.test)
  hum.connect(filter(ctx, 'lowpass', 600, 0.7)).connect(beds.cam)
  record.start()
  tone.start()
  hum.start()

  return {
    ctx,
    master,
    music,
    wall,
    wallLevel,
    tv,
    toTv,
    radio,
    mixIn,
    listen,
    hushLevel,
    beds,
    noise: buffer(ctx, 1, 2, whiteNoise),
  }
}

function kick(mix: Mixer, time: number) {
  const body = mix.ctx.createOscillator()
  body.frequency.setValueAtTime(150, time)
  body.frequency.exponentialRampToValueAtTime(46, time + 0.13)
  const level = mix.ctx.createGain()
  pluck(level.gain, time, 1, 0.003, 0.4)
  body.connect(level).connect(mix.music)
  body.start(time)
  body.stop(time + 0.45)
}

function clap(mix: Mixer, time: number) {
  const source = noise(mix)
  const level = mix.ctx.createGain()
  const gain = level.gain
  gain.setValueAtTime(0.0001, time)
  // Three hands a few milliseconds apart, then the tail.
  for (const offset of [0, 0.011, 0.022]) {
    gain.setValueAtTime(0.55, time + offset)
    gain.exponentialRampToValueAtTime(0.06, time + offset + 0.009)
  }
  gain.setValueAtTime(0.45, time + 0.033)
  gain.exponentialRampToValueAtTime(0.0001, time + 0.26)
  source.connect(filter(mix.ctx, 'bandpass', 1150, 0.9)).connect(level).connect(mix.music)
  source.start(time, Math.random())
  source.stop(time + 0.28)
}

function bass(mix: Mixer, time: number, frequency: number) {
  const tone = mix.ctx.createOscillator()
  tone.type = 'sawtooth'
  tone.frequency.value = frequency
  const low = filter(mix.ctx, 'lowpass', 900, 5)
  low.frequency.setValueAtTime(900, time)
  low.frequency.exponentialRampToValueAtTime(200, time + 0.18)
  const level = mix.ctx.createGain()
  pluck(level.gain, time, 0.45, 0.006, 0.22)
  tone.connect(low).connect(level).connect(mix.music)
  tone.start(time)
  tone.stop(time + 0.25)
}

/** An organ chord, short and square. */
function stab(mix: Mixer, time: number, chord: number[]) {
  const level = mix.ctx.createGain()
  pluck(level.gain, time, 0.12, 0.005, 0.3)
  const low = filter(mix.ctx, 'lowpass', 2000, 1)
  low.connect(level).connect(mix.music)
  for (const frequency of chord) {
    const tone = mix.ctx.createOscillator()
    tone.type = 'square'
    tone.frequency.value = frequency
    tone.detune.value = (Math.random() - 0.5) * 10
    tone.connect(low)
    tone.start(time)
    tone.stop(time + 0.33)
  }
}

/** One sixteenth of the groove: four to the floor, claps on two and four, an off-beat bass and organ stabs. */
export function playStep(mix: Mixer, step: number, time: number) {
  const bar = PROGRESSION[Math.floor(step / 16) % PROGRESSION.length]
  const sixteenth = step % 16
  if (sixteenth % 4 === 0) kick(mix, time)
  if (sixteenth === 4 || sixteenth === 12) clap(mix, time)
  if (sixteenth % 4 === 2) bass(mix, time, bar.bass)
  if (sixteenth === 3 || sixteenth === 6 || sixteenth === 10) stab(mix, time, bar.chord)
}

/** The knob's detent: a click and the thud of the knob itself. */
function clunk(mix: Mixer, time: number) {
  const click = noise(mix)
  const clickLevel = mix.ctx.createGain()
  pluck(clickLevel.gain, time, 0.3, 0.001, 0.02)
  click.connect(filter(mix.ctx, 'highpass', 1800, 0.7)).connect(clickLevel).connect(mix.master)
  click.start(time, Math.random())
  click.stop(time + 0.04)
  const body = mix.ctx.createOscillator()
  body.frequency.setValueAtTime(190, time)
  body.frequency.exponentialRampToValueAtTime(80, time + 0.05)
  const bodyLevel = mix.ctx.createGain()
  pluck(bodyLevel.gain, time, 0.25, 0.002, 0.07)
  body.connect(bodyLevel).connect(mix.master)
  body.start(time)
  body.stop(time + 0.09)
}

/** Static between channels, timed with the picture: up in 0.11 s, gone by 0.43 s. */
function staticBurst(mix: Mixer, time: number) {
  const source = noise(mix)
  const level = mix.ctx.createGain()
  level.gain.setValueAtTime(0.0001, time)
  level.gain.exponentialRampToValueAtTime(0.32, time + 0.03)
  level.gain.setValueAtTime(0.32, time + 0.11)
  level.gain.linearRampToValueAtTime(0.0001, time + 0.43)
  source.connect(filter(mix.ctx, 'bandpass', 2600, 0.5)).connect(level).connect(mix.tv)
  source.start(time, Math.random())
  source.stop(time + 0.45)
}

/** A lamp's pull switch: the click down and the click back. */
function lampSwitch(mix: Mixer, time: number) {
  for (const [offset, peak] of [
    [0, 0.22],
    [0.07, 0.12],
  ] as const) {
    const source = noise(mix)
    const level = mix.ctx.createGain()
    pluck(level.gain, time + offset, peak, 0.001, 0.03)
    source.connect(filter(mix.ctx, 'bandpass', 3300, 4)).connect(level).connect(mix.master)
    source.start(time + offset, Math.random())
    source.stop(time + offset + 0.05)
  }
}

class CasaSound {
  private context: AudioContext | null = null
  private mix: Mixer | null = null
  private enabled = false
  private present = false
  private closeness = 0
  private channel: ChannelId = 'next'
  private step = 0
  private nextTime = 0
  /** When step 0 would have played: the kicks fall on this grid. */
  private origin = 0
  private timer = 0
  private sleep = 0
  private listeners = new Set<() => void>()
  /** Casa Radio: what's selected, whether it's playing, and the player for mixes that are audio files. */
  private station: RadioState = { on: false, mix: mixes[0] }
  private player: HTMLAudioElement | null = null
  private heard = { slow: 0, beat: 0 }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  isOn = () => this.enabled

  /** Turns the room's sound on or off. Call it from a click or key press: browsers only start audio after one. */
  toggle = () => {
    if (typeof AudioContext === 'undefined') return
    this.enabled = !this.enabled
    if (this.enabled) this.wake()
    this.refresh()
    this.notify()
  }

  /** Casa Radio's state, for useSyncExternalStore: the same object until something changes. */
  radio = () => this.station

  /** Puts a mix on Casa Radio (the current one if no id), from a click or key press. */
  playRadio = (id?: string) => {
    if (typeof AudioContext === 'undefined') return
    const mix = mixes.find((candidate) => candidate.id === id) ?? this.station.mix
    this.station = { on: true, mix }
    this.wake()
    this.refresh()
    this.notify()
  }

  pauseRadio = () => {
    if (!this.station.on) return
    this.station = { ...this.station, on: false }
    this.refresh()
    this.notify()
  }

  toggleRadio = () => (this.station.on ? this.pauseRadio() : this.playRadio())

  /** The next mix in the list, looping. */
  nextMix = () => {
    const at = mixes.indexOf(this.station.mix)
    const mix = mixes[(at + 1) % mixes.length]
    if (mix === this.station.mix) return
    this.station = { ...this.station, mix }
    this.refresh()
    this.notify()
  }

  /** What's on air, for the TV's vinyl channel; null while the radio is off. */
  onAir() {
    return this.station.on ? this.station.mix : null
  }

  private notify() {
    for (const listener of this.listeners) listener()
  }

  /** Whether the room is on screen, and how far the camera has walked in (0–1): the club gets clearer closer up. */
  setPresence(present: boolean, closeness: number) {
    if (present === this.present && Math.abs(closeness - this.closeness) < 0.01) return
    this.present = present
    this.closeness = closeness
    this.refresh()
  }

  /** A channel change: the clunk and the static (when `changed`), then that channel's own sound. */
  tune(channel: ChannelId, changed: boolean) {
    this.channel = channel
    const mix = this.mix
    if (!mix || !this.inRoom()) return
    const now = mix.ctx.currentTime
    if (changed) {
      clunk(mix, now)
      staticBurst(mix, now)
    }
    this.applyBed(changed ? now + 0.11 : now)
  }

  lamp() {
    if (this.mix && this.inRoom()) lampSwitch(this.mix, this.mix.ctx.currentTime)
  }

  /**
   * How hard the last kick is still sounding (0–1), for lamps that swell with the beat. From the groove's own
   * clock, or, for a mix, by listening for jumps in its low end. 0 while silent.
   */
  pulse = () => {
    // Every lamp asks each frame; work it out once per frame.
    const at = performance.now()
    if (at - this.pulsed.at < 8) return this.pulsed.value
    this.pulsed = { at, value: this.measurePulse() }
    return this.pulsed.value
  }

  private pulsed = { at: -Infinity, value: 0 }

  private measurePulse() {
    const context = this.context
    const mix = this.mix
    if (!context || !mix || context.state !== 'running') return 0
    const level = Math.min(1, mix.master.gain.value / MASTER)
    if (this.playingFile()) {
      const bins = new Uint8Array(mix.listen.frequencyBinCount)
      mix.listen.getByteFrequencyData(bins)
      // The first few bins are the kick and the bass (about 0–260 Hz at 48 kHz).
      const low = (bins[1] + bins[2] + bins[3]) / (3 * 255)
      const heard = this.heard
      heard.beat = Math.max(heard.beat * 0.86, Math.min(1, Math.max(0, low - heard.slow) * 5))
      heard.slow += (low - heard.slow) * 0.05
      return heard.beat * level
    }
    if (!this.timer) return 0
    const heard = context.currentTime - (context.baseLatency || 0) - (context.outputLatency || 0)
    const since = heard - this.origin
    if (since < 0) return 0
    return Math.exp(-(since % BEAT) * 9) * level
  }

  /** The room's own sound: on, and the room on screen. */
  private inRoom() {
    return this.enabled && this.present && !document.hidden
  }

  /** Casa Radio is playing an audio file (which, unlike the groove, carries on in a hidden tab). */
  private playingFile() {
    return this.station.on && Boolean(this.station.mix.src)
  }

  private wake() {
    if (!this.context) {
      const context = new AudioContext()
      this.context = context
      this.mix = createMixer(context, context.destination)
      document.addEventListener('visibilitychange', () => this.refresh())
      // Plays through the iPhone's silent switch, like any other media the visitor starts themselves.
      const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession
      if (session) session.type = 'playback'
    }
    this.context.resume().catch(() => {})
  }

  /**
   * Sets every level from the state. The room (when on and on screen) has the club through the wall, its hush and
   * the set's noises. Casa Radio replaces the wall: the groove clearly, or a mix from its audio file.
   */
  private refresh() {
    const context = this.context
    const mix = this.mix
    if (!context || !mix) return
    const now = context.currentTime
    const room = this.inRoom()
    const file = this.playingFile()
    const groove = this.station.on && !file && !document.hidden
    const audible = room || groove || file

    mix.wall.frequency.setTargetAtTime(380 + 320 * this.closeness, now, 0.25)
    mix.wallLevel.gain.setTargetAtTime(room && !this.station.on ? 0.42 + 0.3 * this.closeness : 0, now, 0.25)
    mix.radio.gain.setTargetAtTime(groove ? 0.55 : 0, now, 0.2)
    mix.mixIn.gain.setTargetAtTime(file ? 0.9 : 0, now, 0.2)
    mix.hushLevel.gain.setTargetAtTime(room ? 0.05 : 0, now, 0.3)
    mix.master.gain.setTargetAtTime(audible ? MASTER : 0, now, audible ? 0.25 : 0.15)
    this.applyBed(now)
    this.cue(file)

    window.clearTimeout(this.sleep)
    if (audible) {
      // Outside a click or key press the browser may refuse; the sound then starts with the next one.
      context.resume().catch(() => {})
      // The groove's clock runs for the wall and for the radio's groove, not under a mix.
      if ((room && !this.station.on) || groove) this.start()
      else this.stop()
    } else {
      // Let the fade finish, then stop the clock so silence costs nothing.
      this.sleep = window.setTimeout(() => {
        this.stop()
        context.suspend().catch(() => {})
      }, 900)
    }
  }

  /** Starts or stops the audio-file player to match the radio. */
  private cue(play: boolean) {
    const context = this.context
    const mix = this.mix
    const src = this.station.mix.src
    if (!context || !mix) return
    if (!play || !src) {
      this.player?.pause()
      return
    }
    if (!this.player) {
      const player = new Audio()
      // The lamps listen to the mix through Web Audio, which needs the file to allow cross-origin reads.
      player.crossOrigin = 'anonymous'
      player.addEventListener('ended', () => {
        if (mixes.length > 1) return this.nextMix()
        player.currentTime = 0
        player.play().catch(() => {})
      })
      player.addEventListener('error', () => {
        console.warn(`Casa Radio could not play ${player.src}.`)
        this.pauseRadio()
      })
      context.createMediaElementSource(player).connect(mix.mixIn)
      this.player = player
    }
    const url = new URL(src, window.location.href).href
    if (this.player.src !== url) this.player.src = url
    this.player.play().catch(() => {})
  }

  private applyBed(time: number) {
    const mix = this.mix
    if (!mix) return
    const room = this.inRoom()
    for (const bed of Object.keys(BED_LEVELS) as Bed[]) {
      mix.beds[bed].gain.setTargetAtTime(room && bed === this.channel ? BED_LEVELS[bed] : 0, time, 0.05)
    }
    mix.toTv.gain.setTargetAtTime(room && this.channel === 'vinyl' ? 0.55 : 0, time, 0.08)
  }

  private start() {
    const context = this.context
    if (this.timer || !context) return
    this.nextTime = context.currentTime + 0.06
    this.origin = this.nextTime - this.step * SIXTEENTH
    this.timer = window.setInterval(this.schedule, 25)
    this.schedule()
  }

  private stop() {
    window.clearInterval(this.timer)
    this.timer = 0
  }

  private schedule = () => {
    const context = this.context
    const mix = this.mix
    if (!context || !mix) return
    // After a stall (a busy page, a throttled timer), pick the groove up at the next step rather than playing a
    // pile of late notes. The grid, and so the kicks, stay where they were.
    if (this.nextTime < context.currentTime) {
      const missed = Math.ceil((context.currentTime - this.nextTime) / SIXTEENTH)
      this.nextTime += missed * SIXTEENTH
      this.step += missed
    }
    while (this.nextTime < context.currentTime + LOOKAHEAD) {
      playStep(mix, this.step, this.nextTime)
      this.nextTime += SIXTEENTH
      this.step += 1
    }
  }
}

export const casaSound = new CasaSound()
