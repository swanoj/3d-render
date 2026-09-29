import { mixes } from '../content/radio'
import type { GrooveId, Mix } from '../content/types'
import type { ChannelId } from '../three/channels'

/** Casa Radio: the record on air, whether anything's playing, and when deck 1 last changed (`performance.now()`). */
export interface RadioState {
  on: boolean
  mix: Mix
  since: number
}

/** The DJ desk's two turntables: 0 is deck 1, Casa Radio's own, which plays on every page; 1 is deck 2. */
export type DeckIndex = 0 | 1

/** Where a turntable's arm is. */
export type Arm =
  /** On its rest. */
  | { at: 'rest' }
  /** Off the record, in the DJ's fingers: the needle's up, so there's no sound. */
  | { at: 'held' }
  /**
   * On the record, `progress` (0–1) of the way across it when it went down. The needle reaches the groove at
   * `lands` (`performance.now()`): after the whole cue from the rest, or after lowering from the DJ's hand.
   */
  | { at: 'record'; progress: number; lands: number; move: 'cue' | 'lower' }

export interface DeckState {
  /** The record on the platter (none once it's been taken off). */
  record: Mix | null
  /** The start/stop button: the platter turning. */
  motor: boolean
  rpm: 33 | 45
  arm: Arm
  /** When the platter or the arm last changed (`performance.now()`), for the animations. */
  since: number
}

/** A channel's gain and three-band EQ, each -1 (all the way down, or the band killed) to 1, 0 in the middle. */
export interface Eq {
  trim: number
  high: number
  mid: number
  low: number
}

/** The desk's continuous controls. The 3D reads them each frame rather than rendering them. */
export interface DeskControls {
  /** Each deck's pitch fader, -1 to 1 (±8%). */
  pitch: readonly [number, number]
  /** Channel faders, 0 to 1. */
  faders: readonly [number, number]
  /** -1 (deck 1 only) to 1 (deck 2 only), with both at full in the middle. */
  crossfader: number
  eq: readonly [Eq, Eq]
}

/**
 * Seconds from pressing play to the needle landing: the turntable's arm lifts, swings over the record and lowers.
 * The music starts as it lands, and the turntables follow the same timing.
 */
export const NEEDLE_DROP = 1.1
/** Seconds for the needle to settle into the groove when the DJ lowers the arm by hand. */
export const NEEDLE_LOWER = 0.25
/** The pitch fader's range, as on a club turntable: ±8%. */
export const PITCH_RANGE = 0.08
/** 45 rpm against 33⅓. */
export const RPM_45 = 1.35
/** Seconds for the platter to stop after the stop button, and to come up to speed after the start button. */
export const BRAKE = 0.9
export const SPIN_UP = 0.5
/** The endless groove has no end, so the needle crosses the record in 20 minutes and waits at the run-out. */
const GROOVE_SIDE = 20 * 60
/** How far back a deck's scratch buffer reaches, in seconds. */
const TAPE_MAX = 12

const NEUTRAL: Eq = { trim: 0, high: 0, mid: 0, low: 0 }
const REST: Arm = { at: 'rest' }

/** The desk as the page first draws it: the house groove on deck 1 and the next record on deck 2, both stopped. */
export const IDLE_DESK: readonly [DeckState, DeckState] = [
  { record: mixes[0], motor: false, rpm: 33, arm: REST, since: 0 },
  { record: mixes[1] ?? mixes[0], motor: false, rpm: 33, arm: REST, since: 0 },
]
export const IDLE_CONTROLS: DeskControls = { pitch: [0, 0], faders: [1, 1], crossfader: 0, eq: [NEUTRAL, NEUTRAL] }

/** How much of deck `i` the crossfader lets through: all of it in the middle and on its own side. */
export function crossGain(crossfader: number, i: DeckIndex) {
  const away = i === 0 ? crossfader : -crossfader
  return away <= 0 ? 1 : Math.cos((away * Math.PI) / 2)
}

/*
 * Casa TV's sound and the DJ desk's, made with Web Audio so there are no files to load. The club next door comes
 * through the wall as a muffled house groove, the room has its own hush, and the set makes its own noises: the
 * knob's clunk, static between channels, a crackling record on the vinyl channel, the test card's tone and the
 * camera's hum. The two decks play records clearly, each with its own tempo, EQ and needle, through a two-channel
 * mixer. Nothing plays until the visitor asks, and it fades away whenever nothing needs it.
 */

/** The tempo every groove is cut at, at 33⅓ with the pitch fader in the middle. */
export const GROOVE_BPM = 122
const SIXTEENTH = 60 / GROOVE_BPM / 4
/** How far ahead the scheduler books notes, in seconds; it wakes every 25 ms. */
const LOOKAHEAD = 0.12
/** Overall level: the groove peaks around -8 dBFS, background rather than foreground. */
const MASTER = 0.5

interface Bar {
  bass: number
  chord: number[]
}

// A bar each of Am7, Fmaj7, Cmaj7 and G6. The bass sits an octave above sub-bass so laptop and phone speakers
// still carry it through the wall.
const PROGRESSION: Bar[] = [
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
  /** The club's groove, before the wall. */
  music: GainNode
  wall: BiquadFilterNode
  wallLevel: GainNode
  /** The set's speaker. */
  tv: GainNode
  /** The music sent through the set as well (the vinyl channel). */
  toTv: GainNode
  /** Both decks, heard clearly, as if playing in the room. */
  decks: GainNode
  /** Surface noise from a needle in the groove, for each deck to take. */
  crackleBus: AudioNode
  /** The room's hush, only while you're in the room. */
  hushLevel: GainNode
  beds: Record<Bed, GainNode>
  noise: AudioBuffer
  crackle: AudioBuffer
}

/** Where a groove's notes go, and how fast the record turns (1 at the speed it was cut): pitch and tempo follow. */
interface Out {
  ctx: BaseAudioContext
  dest: AudioNode
  noise: AudioBuffer
  rate: number
}

function filter(ctx: BaseAudioContext, type: BiquadFilterType, frequency: number, q: number) {
  const node = ctx.createBiquadFilter()
  node.type = type
  node.frequency.value = Math.min(frequency, 18000)
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

function noise(ctx: BaseAudioContext, source: AudioBuffer) {
  const node = ctx.createBufferSource()
  node.buffer = source
  return node
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

  // The decks, heard clearly with a little of the room's tail, and through the set on the vinyl channel.
  const decks = ctx.createGain()
  decks.connect(filter(ctx, 'lowpass', 7000, 0.7)).connect(master)
  decks.connect(tailLevel)
  decks.connect(toTv)

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
  const surfaceNoise = buffer(ctx, 1, 5, (data) => crackle(data, ctx.sampleRate))
  record.buffer = surfaceNoise
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
  // The same crackle, faintly, under each deck while its needle's in the groove.
  const crackleBus = filter(ctx, 'highpass', 700, 0.7)
  record.connect(crackleBus)
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
    decks,
    crackleBus,
    hushLevel,
    beds,
    noise: buffer(ctx, 1, 2, whiteNoise),
    crackle: surfaceNoise,
  }
}

function kick(out: Out, time: number) {
  const { ctx, rate } = out
  const body = ctx.createOscillator()
  body.frequency.setValueAtTime(150 * rate, time)
  body.frequency.exponentialRampToValueAtTime(46 * rate, time + 0.13 / rate)
  const level = ctx.createGain()
  pluck(level.gain, time, 1, 0.003, 0.4 / rate)
  body.connect(level).connect(out.dest)
  body.start(time)
  body.stop(time + 0.45 / rate)
}

function clap(out: Out, time: number) {
  const { ctx, rate } = out
  const source = noise(ctx, out.noise)
  const level = ctx.createGain()
  const gain = level.gain
  gain.setValueAtTime(0.0001, time)
  // Three hands a few milliseconds apart, then the tail.
  for (const offset of [0, 0.011, 0.022]) {
    gain.setValueAtTime(0.55, time + offset / rate)
    gain.exponentialRampToValueAtTime(0.06, time + (offset + 0.009) / rate)
  }
  gain.setValueAtTime(0.45, time + 0.033 / rate)
  gain.exponentialRampToValueAtTime(0.0001, time + 0.26 / rate)
  source.connect(filter(ctx, 'bandpass', 1150 * rate, 0.9)).connect(level).connect(out.dest)
  source.start(time, Math.random())
  source.stop(time + 0.28 / rate)
}

function bass(out: Out, time: number, frequency: number) {
  const { ctx, rate } = out
  const tone = ctx.createOscillator()
  tone.type = 'sawtooth'
  tone.frequency.value = frequency * rate
  const low = filter(ctx, 'lowpass', 900 * rate, 5)
  low.frequency.setValueAtTime(900 * rate, time)
  low.frequency.exponentialRampToValueAtTime(200 * rate, time + 0.18 / rate)
  const level = ctx.createGain()
  pluck(level.gain, time, 0.45, 0.006, 0.22 / rate)
  tone.connect(low).connect(level).connect(out.dest)
  tone.start(time)
  tone.stop(time + 0.25 / rate)
}

/** A chord, short: square for the house organ, sawtooth for disco brass. */
function stab(out: Out, time: number, chord: number[], wave: OscillatorType = 'square', cutoff = 2000, peak = 0.12) {
  const { ctx, rate } = out
  const level = ctx.createGain()
  pluck(level.gain, time, peak, 0.005, 0.3 / rate)
  const low = filter(ctx, 'lowpass', cutoff * rate, 1)
  low.connect(level).connect(out.dest)
  for (const frequency of chord) {
    const tone = ctx.createOscillator()
    tone.type = wave
    tone.frequency.value = frequency * rate
    tone.detune.value = (Math.random() - 0.5) * 10
    tone.connect(low)
    tone.start(time)
    tone.stop(time + 0.33 / rate)
  }
}

/** A hi-hat: open rings on, closed is a tick. */
function hat(out: Out, time: number, open: boolean) {
  const { ctx, rate } = out
  const source = noise(ctx, out.noise)
  const level = ctx.createGain()
  pluck(level.gain, time, open ? 0.13 : 0.07, 0.002, (open ? 0.16 : 0.035) / rate)
  source.connect(filter(ctx, 'highpass', 7200 * rate, 0.7)).connect(level).connect(out.dest)
  source.start(time, Math.random())
  source.stop(time + (open ? 0.2 : 0.05) / rate)
}

/** A rimshot's click, for the deep groove. */
function rim(out: Out, time: number) {
  const { ctx, rate } = out
  const source = noise(ctx, out.noise)
  const level = ctx.createGain()
  pluck(level.gain, time, 0.3, 0.001, 0.035 / rate)
  source.connect(filter(ctx, 'bandpass', 3100 * rate, 5)).connect(level).connect(out.dest)
  source.start(time, Math.random())
  source.stop(time + 0.05 / rate)
}

/** A brushed snare: a soft swish rather than a crack. */
function brush(out: Out, time: number) {
  const { ctx, rate } = out
  const source = noise(ctx, out.noise)
  const level = ctx.createGain()
  pluck(level.gain, time, 0.16, 0.012, 0.22 / rate)
  source.connect(filter(ctx, 'bandpass', 2300 * rate, 0.8)).connect(level).connect(out.dest)
  source.start(time, Math.random())
  source.stop(time + 0.26 / rate)
}

/** A warm pad that swells and lingers across the bar, for the deep groove. */
function pad(out: Out, time: number, chord: number[]) {
  const { ctx, rate } = out
  const level = ctx.createGain()
  level.gain.setValueAtTime(0.0001, time)
  level.gain.exponentialRampToValueAtTime(0.07, time + 0.35 / rate)
  level.gain.exponentialRampToValueAtTime(0.0001, time + 1.9 / rate)
  const low = filter(ctx, 'lowpass', 1100 * rate, 0.7)
  low.connect(level).connect(out.dest)
  for (const frequency of chord) {
    const tone = ctx.createOscillator()
    tone.type = 'triangle'
    tone.frequency.value = frequency * rate
    tone.detune.value = (Math.random() - 0.5) * 14
    tone.connect(low)
    tone.start(time)
    tone.stop(time + 2 / rate)
  }
}

/** An electric piano chord: sine tones with a bell-like overtone, for Sunday. */
function keys(out: Out, time: number, chord: number[]) {
  const { ctx, rate } = out
  const level = ctx.createGain()
  pluck(level.gain, time, 0.09, 0.006, 0.9 / rate)
  level.connect(out.dest)
  for (const frequency of chord) {
    for (const [multiple, share] of [
      [1, 1],
      [2, 0.18],
    ] as const) {
      const tone = ctx.createOscillator()
      tone.frequency.value = frequency * multiple * rate
      tone.detune.value = (Math.random() - 0.5) * 6
      const partial = ctx.createGain()
      partial.gain.value = share
      tone.connect(partial).connect(level)
      tone.start(time)
      tone.stop(time + 1 / rate)
    }
  }
}

interface Groove {
  progression: Bar[]
  /** Plays one sixteenth (0–15) of a bar. */
  play: (out: Out, sixteenth: number, time: number, bar: Bar) => void
}

/** Every groove is cut at the same tempo, so two decks at the same speed stay on the same beat. */
const GROOVES: Record<GrooveId, Groove> = {
  // Four to the floor, claps on two and four, an off-beat bass and organ stabs.
  house: {
    progression: PROGRESSION,
    play(out, sixteenth, time, bar) {
      if (sixteenth % 4 === 0) kick(out, time)
      if (sixteenth === 4 || sixteenth === 12) clap(out, time)
      if (sixteenth % 4 === 2) bass(out, time, bar.bass)
      if (sixteenth === 3 || sixteenth === 6 || sixteenth === 10) stab(out, time, bar.chord)
    },
  },
  // Am9, Dm9, Fmaj7♯11, Em7: rimshots, a syncopated bass and a pad that swells across each bar.
  deep: {
    progression: [
      { bass: 110, chord: [196, 246.94, 261.63, 329.63] },
      { bass: 146.83, chord: [174.61, 220, 261.63, 329.63] },
      { bass: 87.31, chord: [220, 261.63, 329.63, 493.88] },
      { bass: 82.41, chord: [196, 246.94, 293.66, 329.63] },
    ],
    play(out, sixteenth, time, bar) {
      if (sixteenth % 4 === 0) kick(out, time)
      if (sixteenth === 4 || sixteenth === 12) rim(out, time)
      if (sixteenth % 2 === 1) hat(out, time, false)
      if (sixteenth === 0 || sixteenth === 7 || sixteenth === 10) bass(out, time, bar.bass)
      if (sixteenth === 0) pad(out, time, bar.chord)
    },
  },
  // Fmaj7, Em7, Dm7, Cmaj7: open hats on the off-beat, an octave-jumping bass and brass stabs.
  disco: {
    progression: [
      { bass: 87.31, chord: [220, 261.63, 329.63, 349.23] },
      { bass: 82.41, chord: [196, 246.94, 293.66, 329.63] },
      { bass: 73.42, chord: [220, 261.63, 293.66, 349.23] },
      { bass: 130.81, chord: [196, 246.94, 261.63, 329.63] },
    ],
    play(out, sixteenth, time, bar) {
      if (sixteenth % 4 === 0) kick(out, time)
      if (sixteenth === 4 || sixteenth === 12) clap(out, time)
      if (sixteenth % 4 === 2) hat(out, time, true)
      if (sixteenth % 2 === 0) bass(out, time, sixteenth % 4 === 2 ? bar.bass * 2 : bar.bass)
      if (sixteenth === 2 || sixteenth === 10) stab(out, time, bar.chord, 'sawtooth', 3200, 0.07)
    },
  },
  // Ebmaj9, Cm9, Fm9, B♭13: a laid-back kick, brushes, a walking bass and electric piano.
  sunday: {
    progression: [
      { bass: 77.78, chord: [196, 233.08, 293.66, 349.23] },
      { bass: 130.81, chord: [233.08, 293.66, 311.13, 392] },
      { bass: 87.31, chord: [207.65, 261.63, 311.13, 392] },
      { bass: 116.54, chord: [207.65, 293.66, 392, 415.3] },
    ],
    play(out, sixteenth, time, bar) {
      if (sixteenth === 0 || sixteenth === 8 || sixteenth === 10) kick(out, time)
      if (sixteenth === 4 || sixteenth === 12) brush(out, time)
      if (sixteenth % 2 === 0) hat(out, time, false)
      if (sixteenth % 4 === 0) bass(out, time, bar.bass * [1, 1.5, 2, 1.68][sixteenth / 4])
      if (sixteenth === 0 || sixteenth === 7) keys(out, time, bar.chord)
    },
  },
}

/** One sixteenth of a groove. */
function playStep(out: Out, step: number, time: number, groove: GrooveId) {
  const { progression, play } = GROOVES[groove]
  play(out, mod(step, 16), time, progression[mod(Math.floor(step / 16), progression.length)])
}

function mod(value: number, by: number) {
  return ((value % by) + by) % by
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

/** A copy of a pair with one side changed. */
function pair<T>(values: readonly [T, T], i: DeckIndex, value: T): readonly [T, T] {
  return i === 0 ? [value, values[1]] : [values[0], value]
}

/** The knob's detent: a click and the thud of the knob itself. */
function clunk(mix: Mixer, time: number) {
  const click = noise(mix.ctx, mix.noise)
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
  const source = noise(mix.ctx, mix.noise)
  const level = mix.ctx.createGain()
  level.gain.setValueAtTime(0.0001, time)
  level.gain.exponentialRampToValueAtTime(0.32, time + 0.03)
  level.gain.setValueAtTime(0.32, time + 0.11)
  level.gain.linearRampToValueAtTime(0.0001, time + 0.43)
  source.connect(filter(mix.ctx, 'bandpass', 2600, 0.5)).connect(level).connect(mix.tv)
  source.start(time, Math.random())
  source.stop(time + 0.45)
}

/** The turntable's cue lever: a soft, damped click as the arm lifts or lowers. */
function cueLever(mix: Mixer, time: number) {
  const source = noise(mix.ctx, mix.noise)
  const level = mix.ctx.createGain()
  pluck(level.gain, time, 0.07, 0.002, 0.04)
  source.connect(filter(mix.ctx, 'bandpass', 1700, 2.5)).connect(level).connect(mix.master)
  source.start(time, Math.random())
  source.stop(time + 0.06)
}

/** The start/stop button's clack and the thump of the motor's relay. */
function startStop(mix: Mixer, time: number) {
  const click = noise(mix.ctx, mix.noise)
  const clickLevel = mix.ctx.createGain()
  pluck(clickLevel.gain, time, 0.16, 0.001, 0.025)
  click.connect(filter(mix.ctx, 'bandpass', 2200, 1.4)).connect(clickLevel).connect(mix.master)
  click.start(time, Math.random())
  click.stop(time + 0.05)
  const body = mix.ctx.createOscillator()
  body.frequency.setValueAtTime(120, time)
  body.frequency.exponentialRampToValueAtTime(60, time + 0.06)
  const bodyLevel = mix.ctx.createGain()
  pluck(bodyLevel.gain, time, 0.12, 0.002, 0.06)
  body.connect(bodyLevel).connect(mix.master)
  body.start(time)
  body.stop(time + 0.09)
}

/**
 * The needle landing: a soft thud through the plinth, the stylus's tick and a second of lead-in crackle, through
 * the deck's channel. Returns the sounds, so lifting the arm before the needle lands can cancel them.
 */
function needleDown(mix: Mixer, time: number, dest: AudioNode): AudioScheduledSourceNode[] {
  const body = mix.ctx.createOscillator()
  body.frequency.setValueAtTime(72, time)
  body.frequency.exponentialRampToValueAtTime(38, time + 0.12)
  const bodyLevel = mix.ctx.createGain()
  pluck(bodyLevel.gain, time, 0.2, 0.004, 0.16)
  body.connect(bodyLevel).connect(dest)
  body.start(time)
  body.stop(time + 0.22)

  const tick = noise(mix.ctx, mix.noise)
  const tickLevel = mix.ctx.createGain()
  pluck(tickLevel.gain, time, 0.1, 0.001, 0.03)
  tick.connect(filter(mix.ctx, 'bandpass', 2800, 1.2)).connect(tickLevel).connect(dest)
  tick.start(time, Math.random())
  tick.stop(time + 0.05)

  const lead = noise(mix.ctx, mix.crackle)
  const leadLevel = mix.ctx.createGain()
  pluck(leadLevel.gain, time, 0.6, 0.01, 1.2)
  lead.connect(filter(mix.ctx, 'highpass', 900, 0.7)).connect(leadLevel).connect(dest)
  lead.start(time, Math.random() * 3)
  lead.stop(time + 1.3)
  return [body, tick, lead]
}

/** Stops sounds that may not have started yet (or may already have ended, which some browsers object to). */
function cancel(sounds: AudioScheduledSourceNode[]) {
  for (const sound of sounds) {
    try {
      sound.stop()
    } catch {
      // Already over.
    }
  }
}

/** A lamp's pull switch: the click down and the click back. */
function lampSwitch(mix: Mixer, time: number) {
  for (const [offset, peak] of [
    [0, 0.22],
    [0.07, 0.12],
  ] as const) {
    const source = noise(mix.ctx, mix.noise)
    const level = mix.ctx.createGain()
    pluck(level.gain, time + offset, peak, 0.001, 0.03)
    source.connect(filter(mix.ctx, 'bandpass', 3300, 4)).connect(level).connect(mix.master)
    source.start(time + offset, Math.random())
    source.stop(time + offset + 0.05)
  }
}

/** A groove's place: the next sixteenth to write and when, and when the last few beats were written. */
interface Clock {
  step: number
  nextTime: number
  beats: number[]
}

/**
 * A deck's tape delay, which bends its music the way a record's speed does: held at `from`, or from `from` at
 * `start`, braking to a stop or spinning up over `duration`. It goes back to no delay at `reset`.
 */
interface TapePlan {
  kind: 'hold' | 'brake' | 'spin'
  from: number
  start: number
  duration: number
  reset: number
}

function tapeAt(plan: TapePlan, time: number) {
  if (time >= plan.reset) return 0
  const u = clamp(time - plan.start, 0, plan.duration)
  // Braking, the delay grows faster and faster (the music slows to a stop); spinning up, it grows less and less.
  if (plan.kind === 'brake') return plan.from + (u * u) / (2 * plan.duration)
  if (plan.kind === 'spin') return plan.from + u - (u * u) / (2 * plan.duration)
  return plan.from
}

/** How hard the last beat written on `clock` still sounds at `time` (0–1). */
function beatPulse(clock: Clock, time: number, rate: number) {
  let last = -Infinity
  for (const beat of clock.beats) if (beat <= time && beat > last) last = beat
  return last === -Infinity ? 0 : Math.exp(-(time - last) * 9 * rate)
}

/** A knob's -1 to 1 in decibels: all the way down cuts by `cut`, all the way up adds 6 dB. */
function knobDb(value: number, cut: number) {
  return value < 0 ? value * cut : value * 6
}

/** One deck's sound: its groove (or its mix's audio file), tape, EQ, needle and channel on the mixer. */
interface DeckVoice {
  out: Out
  clock: Clock
  /** Writing the groove's notes, up to `until` (a braking record plays on a little as it slows). */
  running: boolean
  until: number
  grooveLevel: GainNode
  fileLevel: GainNode
  tape: DelayNode
  plan: TapePlan
  trim: GainNode
  low: BiquadFilterNode
  mid: BiquadFilterNode
  high: BiquadFilterNode
  /** The needle: open while it's in the groove. */
  gate: GainNode
  /** The channel fader and the crossfader. */
  channel: GainNode
  listen: AnalyserNode
  heard: { slow: number; beat: number }
  player: HTMLAudioElement | null
  /** Where to start the audio file (0–1) once it's loaded. */
  seek: number | null
  /** When the needle lands (audio clock). */
  dropAt: number
  landing: AudioScheduledSourceNode[]
  /** The last scratch (audio clock), 0 when the record's not in the DJ's hand. */
  scratchAt: number
  pulsed: { at: number; value: number }
}

function createDeck(mix: Mixer): DeckVoice {
  const { ctx } = mix
  const input = ctx.createGain()
  const grooveLevel = ctx.createGain()
  grooveLevel.gain.value = 0.55
  grooveLevel.connect(input)
  const fileLevel = ctx.createGain()
  fileLevel.gain.value = 0.9
  fileLevel.connect(input)
  const surface = ctx.createGain()
  surface.gain.value = 0.035
  mix.crackleBus.connect(surface).connect(input)
  const tape = ctx.createDelay(TAPE_MAX)
  tape.delayTime.value = 0
  const trim = ctx.createGain()
  const low = filter(ctx, 'lowshelf', 250, 0.7)
  const mid = filter(ctx, 'peaking', 1000, 0.8)
  const high = filter(ctx, 'highshelf', 3500, 0.7)
  const gate = ctx.createGain()
  gate.gain.value = 0
  const channel = ctx.createGain()
  const listen = ctx.createAnalyser()
  listen.fftSize = 512
  listen.smoothingTimeConstant = 0.5
  input.connect(tape).connect(trim).connect(low).connect(mid).connect(high).connect(gate)
  gate.connect(listen)
  gate.connect(channel).connect(mix.decks)
  return {
    out: { ctx, dest: grooveLevel, noise: mix.noise, rate: 1 },
    clock: { step: 0, nextTime: 0, beats: [] },
    running: false,
    until: Infinity,
    grooveLevel,
    fileLevel,
    tape,
    plan: { kind: 'hold', from: 0, start: 0, duration: 0, reset: Infinity },
    trim,
    low,
    mid,
    high,
    gate,
    channel,
    listen,
    heard: { slow: 0, beat: 0 },
    player: null,
    seek: null,
    dropAt: 0,
    landing: [],
    scratchAt: 0,
    pulsed: { at: -Infinity, value: 0 },
  }
}

class CasaSound {
  private context: AudioContext | null = null
  private mix: Mixer | null = null
  private voices: readonly [DeckVoice, DeckVoice] | null = null
  private enabled = false
  private present = false
  private closeness = 0
  private channel: ChannelId = 'next'
  /** The club's groove through the wall, while the room's on screen and no deck is playing. */
  private wallClock: Clock = { step: 0, nextTime: 0, beats: [] }
  private wallOut: Out | null = null
  private wallOn = false
  private timer = 0
  private sleep = 0
  private listeners = new Set<() => void>()
  private controlListeners = new Set<() => void>()
  private decks: readonly [DeckState, DeckState] = IDLE_DESK
  private controlState: DeskControls = IDLE_CONTROLS
  private station: RadioState = { on: false, mix: mixes[0], since: 0 }
  /** Where each needle was (0–1) at a moment (`performance.now()`), to work out where it is now. */
  private tracks = [
    { base: 0, at: 0 },
    { base: 0, at: 0 },
  ]
  private pulsed = { at: -Infinity, value: 0 }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** For the desk's continuous controls, which change while they're dragged. */
  subscribeControls = (listener: () => void) => {
    this.controlListeners.add(listener)
    return () => {
      this.controlListeners.delete(listener)
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

  /** Both decks, for useSyncExternalStore. */
  desk = () => this.decks

  controls = () => this.controlState

  /** Whether deck `i` is playing: a record on, the platter turning and the needle down (or on its way). */
  isPlaying = (i: DeckIndex) => {
    const deck = this.decks[i]
    return Boolean(deck.record) && deck.motor && deck.arm.at === 'record'
  }

  /** How fast deck `i`'s record turns, against 33⅓ rpm: the pitch fader and the 45 button. */
  speed = (i: DeckIndex) => (this.decks[i].rpm === 45 ? RPM_45 : 1) * (1 + this.controlState.pitch[i] * PITCH_RANGE)

  /** Puts a record on Casa Radio (deck 1), the current one if no id, from a click or key press. */
  playRadio = (id?: string) => this.play(0, id)

  /** Lifts every needle: the music stops at once. */
  pauseRadio = () => {
    this.pause(0)
    this.pause(1)
  }

  toggleRadio = () => (this.station.on ? this.pauseRadio() : this.playRadio())

  /**
   * Wakes the audio from a click or tap without playing anything, so a record that starts a moment later (after
   * its flight to the deck) is allowed to play.
   */
  warmUp = () => {
    if (typeof AudioContext === 'undefined') return
    this.wake()
    this.refresh()
  }

  /** The next record in the list on the deck on air, looping. While playing, the needle drops on the new one. */
  nextMix = () => {
    const i = this.onAirDeck() ?? 0
    const record = this.decks[i].record
    const mix = mixes[record ? (mixes.indexOf(record) + 1) % mixes.length : 0]
    if (!mix || mix === record) return
    if (this.isPlaying(i)) this.play(i, mix.id)
    else this.change(i, { record: mix })
  }

  /** How far deck 1's needle has crossed its record, 0–1. */
  progress = () => this.deckProgress(0)

  /**
   * How far deck `i`'s needle has crossed the record, 0–1: through the mix's audio file, or for the endless
   * groove, through a 20-minute side.
   */
  deckProgress = (i: DeckIndex) => {
    const deck = this.decks[i]
    const { base, at } = this.tracks[i]
    if (deck.arm.at !== 'record') return base
    const player = this.voices?.[i].player
    if (deck.record?.src && player && Number.isFinite(player.duration) && player.duration > 0) {
      return Math.min(1, player.currentTime / player.duration)
    }
    if (!deck.motor) return base
    const played = Math.max(0, performance.now() - Math.max(at, deck.arm.lands)) / 1000
    return Math.min(1, base + (played * this.speed(i)) / GROOVE_SIDE)
  }

  /** Plays deck `i`: puts record `id` on if given, starts the platter and cues the arm to the first groove. */
  play = (i: DeckIndex, id?: string) => {
    const record = mixes.find((mix) => mix.id === id) ?? this.decks[i].record ?? mixes[0]
    this.wake()
    this.change(i, {
      record,
      motor: true,
      arm: { at: 'record', progress: 0, lands: performance.now() + NEEDLE_DROP * 1000, move: 'cue' },
    })
  }

  /** Takes deck `i`'s arm home and stops its platter. */
  pause = (i: DeckIndex) => {
    const deck = this.decks[i]
    if (deck.arm.at === 'rest' && !deck.motor) return
    this.change(i, { motor: false, arm: REST })
  }

  /** The start/stop button. */
  setMotor = (i: DeckIndex, on: boolean) => {
    if (this.decks[i].motor === on) return
    this.wake()
    if (this.mix) startStop(this.mix, this.mix.ctx.currentTime)
    this.change(i, { motor: on })
  }

  toggleMotor = (i: DeckIndex) => this.setMotor(i, !this.decks[i].motor)

  /** The 33 and 45 buttons. */
  setRpm = (i: DeckIndex, rpm: 33 | 45) => {
    if (this.decks[i].rpm === rpm) return
    if (this.mix) startStop(this.mix, this.mix.ctx.currentTime)
    this.change(i, { rpm })
  }

  /** The DJ takes hold of deck `i`'s arm: the needle comes up. */
  holdArm = (i: DeckIndex) => {
    if (this.decks[i].arm.at === 'held') return
    this.wake()
    this.change(i, { arm: { at: 'held' } })
  }

  /** The DJ lowers the needle onto the record, `progress` of the way across; the platter starts if it's stopped. */
  dropArm = (i: DeckIndex, progress: number) => {
    if (!this.decks[i].record) return this.pause(i)
    this.wake()
    this.change(i, {
      motor: true,
      arm: { at: 'record', progress: clamp(progress, 0, 1), lands: performance.now() + NEEDLE_LOWER * 1000, move: 'lower' },
    })
  }

  /** Takes the record off deck `i`, lifting the needle and stopping the platter first. Returns it. */
  eject = (i: DeckIndex) => {
    const record = this.decks[i].record
    if (record) this.change(i, { record: null, motor: false, arm: REST })
    return record
  }

  setPitch = (i: DeckIndex, value: number) => {
    const pitch = clamp(value, -1, 1)
    if (pitch === this.controlState.pitch[i]) return
    this.rebase(i)
    this.setControls({ pitch: pair(this.controlState.pitch, i, pitch) })
  }

  setFader = (i: DeckIndex, value: number) => {
    const level = clamp(value, 0, 1)
    if (level !== this.controlState.faders[i]) this.setControls({ faders: pair(this.controlState.faders, i, level) })
  }

  setCrossfader = (value: number) => {
    const crossfader = clamp(value, -1, 1)
    if (crossfader !== this.controlState.crossfader) this.setControls({ crossfader })
  }

  setEq = (i: DeckIndex, band: keyof Eq, value: number) => {
    const eq = this.controlState.eq[i]
    const level = clamp(value, -1, 1)
    if (level !== eq[band]) this.setControls({ eq: pair(this.controlState.eq, i, { ...eq, [band]: level }) })
  }

  /**
   * The DJ's hand on deck `i`'s record: `rate` is how fast they're turning it, against the platter (1 with it, 0
   * held still, below 0 backwards); null lets go. The music follows through the deck's tape delay, which reaches
   * back `TAPE_MAX` seconds, and carries on from wherever the record's let go.
   */
  scratch = (i: DeckIndex, rate: number | null) => {
    const context = this.context
    const v = this.voices?.[i]
    if (!context || !v) return
    const now = context.currentTime
    if (rate === null || !this.isPlaying(i) || now < v.dropAt) {
      v.scratchAt = 0
      return
    }
    const from = tapeAt(v.plan, now)
    const step = v.scratchAt ? Math.min(0.1, now - v.scratchAt) : 0
    v.scratchAt = now
    const delay = clamp(from + (1 - rate) * step, 0, TAPE_MAX - 0.2)
    if (v.plan.kind !== 'hold') v.tape.delayTime.cancelScheduledValues(now)
    v.tape.delayTime.setTargetAtTime(delay, now, 0.012)
    v.plan = { kind: 'hold', from: delay, start: now, duration: 0, reset: Infinity }
  }

  /**
   * The DJ desk's gone (the visitor left the landing page): deck 2 stops, handing its record to deck 1 if it was
   * the only one playing, and the mixer goes back to neutral for pages without one.
   */
  leaveDesk = () => {
    const record = this.isPlaying(1) && !this.isPlaying(0) ? this.decks[1].record : null
    this.pause(1)
    if (this.decks[0].rpm !== 33) this.change(0, { rpm: 33 })
    this.rebase(0)
    this.setControls(IDLE_CONTROLS)
    if (record) this.play(0, record.id)
  }

  /** What's on air, for the TV's vinyl channel; null while nothing plays. */
  onAir() {
    const i = this.onAirDeck()
    return i === null ? null : this.decks[i].record
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
   * How hard the last kick is still sounding (0–1), for lamps that swell with the beat: the wall's groove, or the
   * loudest deck through the mixer. 0 while silent.
   */
  pulse = () => {
    // Every lamp asks each frame; work it out once per frame.
    const at = performance.now()
    if (at - this.pulsed.at < 8) return this.pulsed.value
    this.pulsed = { at, value: this.measurePulse() }
    return this.pulsed.value
  }

  /**
   * How hard deck `i`'s last kick is still sounding (0–1), before its channel fader: from its groove's own clock,
   * or for a mix, by listening for jumps in its low end.
   */
  deckPulse = (i: DeckIndex) => {
    const v = this.voices?.[i]
    if (!v) return 0
    const at = performance.now()
    if (at - v.pulsed.at >= 8) v.pulsed = { at, value: this.measureDeck(i, v) }
    return v.pulsed.value
  }

  private measurePulse() {
    const context = this.context
    const mix = this.mix
    if (!context || !mix || context.state !== 'running') return 0
    let value = this.wallOn ? beatPulse(this.wallClock, this.heardAt(context), 1) * Math.min(1, mix.master.gain.value / MASTER) : 0
    for (const i of [0, 1] as const) value = Math.max(value, this.deckPulse(i) * this.weight(i))
    return value
  }

  private measureDeck(i: DeckIndex, v: DeckVoice) {
    const context = this.context
    const mix = this.mix
    if (!context || !mix || context.state !== 'running' || !this.isPlaying(i)) return 0
    const level = Math.min(1, mix.master.gain.value / MASTER) * v.gate.gain.value
    if (this.decks[i].record?.src) {
      const bins = new Uint8Array(v.listen.frequencyBinCount)
      v.listen.getByteFrequencyData(bins)
      // The first few bins are the kick and the bass (about 0–260 Hz at 48 kHz).
      const low = (bins[1] + bins[2] + bins[3]) / (3 * 255)
      const heard = v.heard
      heard.beat = Math.max(heard.beat * 0.86, Math.min(1, Math.max(0, low - heard.slow) * 5))
      heard.slow += (low - heard.slow) * 0.05
      return heard.beat * level
    }
    return beatPulse(v.clock, this.heardAt(context) - tapeAt(v.plan, context.currentTime), this.speed(i)) * level
  }

  /** The audio clock's time for what's coming out of the speakers now. */
  private heardAt(context: AudioContext) {
    return context.currentTime - (context.baseLatency || 0) - (context.outputLatency || 0)
  }

  /** How loud deck `i` comes through the mixer, 0–1. */
  private weight(i: DeckIndex) {
    return this.controlState.faders[i] ** 2 * crossGain(this.controlState.crossfader, i)
  }

  /** The deck the room hears most of, of those playing (deck 1 when they're level); null when neither is. */
  private onAirDeck(): DeckIndex | null {
    const first = this.isPlaying(0)
    const second = this.isPlaying(1)
    if (first && second) return this.weight(1) > this.weight(0) + 0.01 ? 1 : 0
    return first ? 0 : second ? 1 : null
  }

  /** Changes deck `i`, and its sound with it. */
  private change(i: DeckIndex, patch: Partial<Omit<DeckState, 'since'>>) {
    const before = this.decks[i]
    const now = performance.now()
    const progress = this.deckProgress(i)
    const after: DeckState = { ...before, ...patch, since: now }
    const arm = after.arm
    this.tracks[i] = { base: arm.at === 'record' && arm !== before.arm ? arm.progress : progress, at: now }
    this.decks = i === 0 ? [after, this.decks[1]] : [this.decks[0], after]
    this.sound(i, before, after)
    this.refresh()
    this.notify()
  }

  /** Carries deck `i`'s needle position over a change of speed. */
  private rebase(i: DeckIndex) {
    this.tracks[i] = { base: this.deckProgress(i), at: performance.now() }
  }

  private setControls(patch: Partial<DeskControls>) {
    this.controlState = { ...this.controlState, ...patch }
    this.applyControls()
    for (const listener of this.controlListeners) listener()
    // The crossfader can change which deck's on air.
    if (this.updateStation()) for (const listener of this.listeners) listener()
  }

  /** The deck's sound as its state changes: the needle lifting and landing, the platter stopping and starting. */
  private sound(i: DeckIndex, before: DeckState, after: DeckState) {
    const context = this.context
    const mix = this.mix
    const v = this.voices?.[i]
    if (!context || !mix || !v) return
    const now = context.currentTime
    const was = before.arm
    const arm = after.arm
    const landing = arm.at === 'record' && arm !== was
    // The needle comes up (perhaps to go down somewhere else).
    if (was.at === 'record' && (arm.at !== 'record' || landing)) {
      if (now < v.dropAt) cancel(v.landing)
      v.dropAt = 0
      v.running = false
      this.silence(v, now)
      cueLever(mix, now)
    }
    if (arm.at === 'record' && landing) {
      const dropAt = now + Math.max(0, (arm.lands - performance.now()) / 1000)
      if (arm.move === 'cue' && was.at !== 'record') cueLever(mix, now + 0.02)
      v.landing = needleDown(mix, dropAt, v.channel)
      v.dropAt = dropAt
      this.cueUp(i, v, arm.progress, dropAt)
      if (after.motor) this.open(v, dropAt)
      return
    }
    if (arm.at !== 'record' || before.motor === after.motor) return
    if (after.motor) this.spinUp(i, v, now)
    else this.brake(v, now)
  }

  /**
   * Readies deck `i` to play from `progress` across its record once the needle lands at `at`. If the other deck is
   * playing a groove at the same speed, it comes in on that deck's grid, on the same beat of the bar.
   */
  private cueUp(i: DeckIndex, v: DeckVoice, progress: number, at: number) {
    if (this.decks[i].record?.src) {
      v.seek = progress
      v.running = false
      return
    }
    let step = Math.round((progress * GROOVE_SIDE) / SIXTEENTH)
    let start = at
    const j: DeckIndex = i === 0 ? 1 : 0
    const other = this.voices?.[j]
    const record = this.decks[j].record
    if (other?.running && other.until === Infinity && this.isPlaying(j) && record && !record.src) {
      if (Math.abs(this.speed(j) - this.speed(i)) < 1e-4) {
        const sixteenth = SIXTEENTH / this.speed(j)
        const lag = tapeAt(other.plan, at)
        const k = Math.ceil((at - lag - other.clock.nextTime) / sixteenth)
        start = other.clock.nextTime + k * sixteenth + lag
        step += mod(other.clock.step + k, 16) - mod(step, 16)
      }
    }
    v.clock = { step, nextTime: start, beats: [] }
    v.running = true
    v.until = Infinity
  }

  /** Shuts the deck's gate (the needle's up), and puts its tape back to no delay once it's quiet. */
  private silence(v: DeckVoice, now: number) {
    v.gate.gain.cancelScheduledValues(now)
    v.gate.gain.setTargetAtTime(0, now, 0.012)
    v.tape.delayTime.cancelScheduledValues(now)
    v.tape.delayTime.setValueAtTime(tapeAt(v.plan, now), now)
    v.tape.delayTime.setValueAtTime(0, now + 0.15)
    v.plan = { kind: 'hold', from: 0, start: now, duration: 0, reset: Infinity }
    v.scratchAt = 0
  }

  /** Opens the deck's gate at `at`: the needle's in the groove. */
  private open(v: DeckVoice, at: number) {
    const now = v.out.ctx.currentTime
    v.gate.gain.cancelScheduledValues(now)
    v.gate.gain.setTargetAtTime(0, now, 0.012)
    v.gate.gain.setTargetAtTime(1, Math.max(at, now), 0.02)
  }

  /** The stop button while playing: the record slows to a stop and the music winds down with it. */
  private brake(v: DeckVoice, now: number) {
    if (now < v.dropAt) {
      // Stopped before the needle landed: it lands on a still record.
      v.running = false
      this.silence(v, now)
      return
    }
    const plan: TapePlan = { kind: 'brake', from: tapeAt(v.plan, now), start: now, duration: BRAKE, reset: now + BRAKE + 0.1 }
    this.bend(v, plan)
    v.tape.delayTime.setValueAtTime(0, plan.reset)
    v.plan = plan
    // The notes run on for as long as the slowing record takes to play them.
    v.until = now + BRAKE / 2
    v.gate.gain.cancelScheduledValues(now)
    v.gate.gain.setTargetAtTime(0, now + BRAKE * 0.7, 0.07)
    v.scratchAt = 0
  }

  /** The start button with the needle in the groove: the music comes up to speed with the platter. */
  private spinUp(i: DeckIndex, v: DeckVoice, now: number) {
    if (now < v.dropAt) {
      this.open(v, v.dropAt)
      return
    }
    const plan: TapePlan = { kind: 'spin', from: tapeAt(v.plan, now), start: now, duration: SPIN_UP, reset: Infinity }
    this.bend(v, plan)
    v.plan = plan
    v.clock.nextTime = Math.max(v.clock.nextTime, now + 0.005)
    v.running = !this.decks[i].record?.src
    v.until = Infinity
    this.open(v, now)
  }

  /** Automates the tape delay along `plan`. */
  private bend(v: DeckVoice, plan: TapePlan) {
    const param = v.tape.delayTime
    const shape = { ...plan, reset: Infinity }
    const values = Float32Array.from({ length: 24 }, (_, k) => tapeAt(shape, plan.start + (k / 23) * plan.duration))
    param.cancelScheduledValues(plan.start)
    try {
      param.setValueCurveAtTime(values, plan.start, plan.duration)
    } catch {
      param.setValueAtTime(values[values.length - 1], plan.start)
    }
  }

  private notify() {
    this.updateStation()
    for (const listener of this.listeners) listener()
  }

  /** Keeps Casa Radio's state in step with the decks; true if it changed. */
  private updateStation() {
    const i = this.onAirDeck()
    const mix = (i === null ? this.decks[0].record : this.decks[i].record) ?? this.station.mix
    const on = i !== null
    const since = this.decks[0].since
    const station = this.station
    if (station.on === on && station.mix === mix && station.since === since) return false
    this.station = { on, mix, since }
    return true
  }

  /** The room's own sound: on, and the room on screen. */
  private inRoom() {
    return this.enabled && this.present && !document.hidden
  }

  private wake() {
    if (typeof AudioContext === 'undefined') return
    if (!this.context) {
      const context = new AudioContext()
      const mix = createMixer(context, context.destination)
      this.context = context
      this.mix = mix
      this.voices = [createDeck(mix), createDeck(mix)]
      this.wallOut = { ctx: context, dest: mix.music, noise: mix.noise, rate: 1 }
      document.addEventListener('visibilitychange', () => this.refresh())
      // Plays through the iPhone's silent switch, like any other media the visitor starts themselves.
      const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession
      if (session) session.type = 'playback'
    }
    this.context.resume().catch(() => {})
  }

  /**
   * Sets every level from the state. The room (when on and on screen) has the club through the wall, its hush and
   * the set's noises; a playing deck replaces the wall.
   */
  private refresh() {
    const context = this.context
    const mix = this.mix
    const voices = this.voices
    if (!context || !mix || !voices) return
    const now = context.currentTime
    const room = this.inRoom()
    const hidden = document.hidden
    const playing = this.isPlaying(0) || this.isPlaying(1)
    // Hands on the decks keep the sound awake, so the next needle drop doesn't fade in.
    const busy = this.decks.some((deck) => deck.motor || deck.arm.at !== 'rest')
    const audible = room || playing || busy
    this.wallOn = room && !playing

    mix.wall.frequency.setTargetAtTime(380 + 320 * this.closeness, now, 0.25)
    mix.wallLevel.gain.setTargetAtTime(this.wallOn ? 0.42 + 0.3 * this.closeness : 0, now, 0.25)
    // The grooves can't keep time in a hidden tab (its timers are throttled); a mix from a file carries on.
    for (const v of voices) v.grooveLevel.gain.setTargetAtTime(hidden ? 0 : 0.55, now, 0.05)
    this.applyControls()
    mix.hushLevel.gain.setTargetAtTime(room ? 0.05 : 0, now, 0.3)
    mix.master.gain.setTargetAtTime(audible ? MASTER : 0, now, audible ? 0.25 : 0.15)
    this.applyBed(now)
    this.cueFile(0)
    this.cueFile(1)

    window.clearTimeout(this.sleep)
    if (audible) {
      // Outside a click or key press the browser may refuse; the sound then starts with the next one.
      context.resume().catch(() => {})
      const writing = this.wallOn || voices.some((v) => v.running && v.until > now)
      if (writing && !hidden) this.start()
      else this.stop()
    } else {
      // Let the fade finish, then stop the clock so silence costs nothing.
      this.sleep = window.setTimeout(() => {
        this.stop()
        context.suspend().catch(() => {})
      }, 900)
    }
  }

  /** The mixer's faders, crossfader and EQ, and each deck's speed for a mix from a file. */
  private applyControls() {
    const context = this.context
    const voices = this.voices
    if (!context || !voices) return
    const now = context.currentTime
    for (const i of [0, 1] as const) {
      const v = voices[i]
      const eq = this.controlState.eq[i]
      v.channel.gain.setTargetAtTime(this.weight(i), now, 0.015)
      v.trim.gain.setTargetAtTime(10 ** (knobDb(eq.trim, 12) / 20), now, 0.015)
      v.high.gain.setTargetAtTime(knobDb(eq.high, 30), now, 0.015)
      v.mid.gain.setTargetAtTime(knobDb(eq.mid, 30), now, 0.015)
      v.low.gain.setTargetAtTime(knobDb(eq.low, 30), now, 0.015)
      if (v.player) v.player.playbackRate = this.speed(i)
    }
  }

  /** Starts or stops deck `i`'s audio-file player to match the deck. */
  private cueFile(i: DeckIndex) {
    const context = this.context
    const v = this.voices?.[i]
    const src = this.decks[i].record?.src
    if (!context || !v) return
    if (!src || !this.isPlaying(i)) {
      // A braking record plays on for a moment as it winds down.
      const player = v.player
      const winding = v.plan.kind === 'brake' ? v.plan.start + BRAKE / 2 - context.currentTime : 0
      if (player && winding > 0) {
        window.setTimeout(() => {
          if (!this.isPlaying(i)) player.pause()
        }, winding * 1000)
      } else player?.pause()
      return
    }
    const player = v.player ?? this.makePlayer(i, v, context)
    const url = new URL(src, window.location.href).href
    if (player.src !== url) player.src = url
    player.preservesPitch = false
    player.playbackRate = this.speed(i)
    if (v.seek !== null && Number.isFinite(player.duration) && player.duration > 0) {
      player.currentTime = v.seek * player.duration
      v.seek = null
    }
    player.play().catch(() => {})
  }

  private makePlayer(i: DeckIndex, v: DeckVoice, context: AudioContext) {
    const player = new Audio()
    // The lamps listen to the mix through Web Audio, which needs the file to allow cross-origin reads.
    player.crossOrigin = 'anonymous'
    player.addEventListener('loadedmetadata', () => {
      if (v.seek === null || !(player.duration > 0)) return
      player.currentTime = v.seek * player.duration
      v.seek = null
    })
    player.addEventListener('ended', () => {
      const record = this.decks[i].record
      const next = mixes[record ? (mixes.indexOf(record) + 1) % mixes.length : 0]
      if (next && next !== record) return this.play(i, next.id)
      player.currentTime = 0
      player.play().catch(() => {})
    })
    player.addEventListener('error', () => {
      console.warn(`Casa Radio could not play ${player.src}.`)
      this.pause(i)
    })
    context.createMediaElementSource(player).connect(v.fileLevel)
    v.player = player
    return player
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
    if (this.timer || !this.context) return
    this.timer = window.setInterval(this.schedule, 25)
    this.schedule()
  }

  private stop() {
    window.clearInterval(this.timer)
    this.timer = 0
  }

  private schedule = () => {
    const context = this.context
    const voices = this.voices
    if (!context || !voices) return
    const now = context.currentTime
    if (this.wallOn && this.wallOut) this.write(this.wallClock, this.wallOut, 'house', now + LOOKAHEAD, now)
    for (const i of [0, 1] as const) {
      const v = voices[i]
      const record = this.decks[i].record
      if (!v.running || v.until <= now || !record || record.src) continue
      v.out.rate = this.speed(i)
      this.write(v.clock, v.out, record.groove ?? 'house', Math.min(now + LOOKAHEAD, v.until), now)
    }
  }

  /** Books a groove's notes up to `horizon`. */
  private write(clock: Clock, out: Out, groove: GrooveId, horizon: number, now: number) {
    const sixteenth = SIXTEENTH / out.rate
    // After a stall (a busy page, a throttled timer), pick the groove up at the next step rather than playing a
    // pile of late notes. The grid, and so the kicks, stay where they were.
    if (clock.nextTime < now) {
      const missed = Math.ceil((now - clock.nextTime) / sixteenth)
      clock.nextTime += missed * sixteenth
      clock.step += missed
    }
    while (clock.nextTime < horizon) {
      playStep(out, clock.step, clock.nextTime, groove)
      if (mod(clock.step, 4) === 0) {
        clock.beats.push(clock.nextTime)
        if (clock.beats.length > 8) clock.beats.shift()
      }
      clock.nextTime += sixteenth
      clock.step += 1
    }
  }
}

export const casaSound = new CasaSound()
