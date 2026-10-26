import {
  BufferAttribute,
  BufferGeometry,
  Camera,
  CustomBlending,
  DoubleSide,
  GLSL3,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  NoBlending,
  OneFactor,
  OneMinusSrcAlphaFactor,
  RawShaderMaterial,
  Scene,
  Texture,
  WebGLRenderer,
  type IUniform,
} from 'three'
import { casaSound, GROOVE_BPM } from '../lib/casaSound'
import { club } from './club'
import { congaVertex, crowdVertex, particleFragment, particleVertex, roomFragment, roomVertex, spriteFragment } from './shaders'

/*
 * The club, drawn on two canvases: the room behind the page (the lights going down over the wordmark wall, beams,
 * Casa-shaped gobos and the mirror ball's specks), and the dance floor in front of it (the crowd, the conga line
 * parading along its top, specks sliding over everything, confetti). It follows the shared
 * club state every frame: the door's swing lets the crowd out, and leaving plays them home.
 */

const SHEET = '/club/mates-gl.png'
/** Beats from one drop to the next: sixteen bars. */
const PHRASE = 64
/** When mates start coming through the door, and when the last one sets off, as fractions of the door's swing. */
const FIRST_OUT = 0.12
const LAST_OUT = 0.84
/** How long one flight from the door takes, in the same units (matches the crowd shader). */
const FLIGHT = 0.16
const ORANGE = [0.914, 0.369, 0.153]
const CREAM = [0.929, 0.882, 0.827]

export interface SceneOptions {
  /** Where the doorway is now, or null if there's no door. */
  door: () => DOMRect | null
  reducedMotion: boolean
  /** A drop landed; `big` for the welcome and the "Drop it" button (confetti). */
  onDrop?: (big: boolean) => void
}

export interface ClubScene {
  /** Plays everyone out, back through the door if it's in sight, or down out of view. */
  leave(): Promise<void>
  drop(): void
  /** The dance floor's height (px), so the page can leave room below its last words. */
  floor(): number
  dispose(): void
}

interface Quality {
  /** Back and front sizes (px), and how close together the crowd stands (smaller is denser). */
  sizes: [number, number]
  spacing: number
  rows: number
  /** Canvas pixels per CSS pixel: the room is soft light, so it renders small. */
  roomScale: number
  frontRatio: number
  conga: number
  specks: number
}

function chooseQuality(width: number): Quality {
  const frontRatio = Math.min(window.devicePixelRatio || 1, 1.5)
  if (width < 700) return { sizes: [9, 74], spacing: 0.4, rows: 18, roomScale: 0.4, frontRatio, conga: 9, specks: 40 }
  if (width < 1100) return { sizes: [12, 100], spacing: 0.42, rows: 22, roomScale: 0.45, frontRatio, conga: 12, specks: 60 }
  return { sizes: [14, 118], spacing: 0.42, rows: 26, roomScale: 0.5, frontRatio, conga: 14, specks: 80 }
}

/** A repeatable random sequence, so the crowd stands the same way every time. */
function seeded(seed: number) {
  let value = seed
  return () => {
    value = (value * 16807) % 2147483647
    return (value - 1) / 2147483646
  }
}

const damp = (current: number, target: number, lambda: number, seconds: number) =>
  target + (current - target) * Math.exp(-lambda * seconds)
const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
const smooth = (value: number) => {
  const t = clamp01(value)
  return t * t * (3 - 2 * t)
}

/** The crowd, back row first so the front draws over it. Each mate's spot, look and route out of the door. */
function layoutCrowd(width: number, quality: Quality) {
  const random = seeded(1984)
  const [small, large] = quality.sizes
  const homes: number[] = []
  const looks: number[] = []
  const moves: number[] = []
  for (let row = 0; row < quality.rows; row++) {
    const depth = row / (quality.rows - 1)
    const size = small + (large - small) * depth ** 1.6
    const count = Math.max(4, Math.round((width + large * 0.7) / (size * quality.spacing)))
    for (let i = 0; i < count; i++) {
      homes.push((i + 0.5 + (random() - 0.5) * 0.8) / count, clamp01(depth + (random() - 0.5) * (0.6 / quality.rows)), random(), random())
      // Casa turns up more than anyone; the mates share the rest.
      const cell = random() < 0.18 ? 0 : 1 + Math.floor(random() * 11)
      const roll = random()
      const tint = roll < 0.48 ? 0 : roll < 0.75 ? 1 : roll < 0.87 ? 2 : 3
      const out = FIRST_OUT + (LAST_OUT - FIRST_OUT) * clamp01(0.65 * random() + 0.35 * depth)
      looks.push(cell, tint, random() < 0.5 ? -1 : 1, out)
      moves.push(random(), (random() - 0.5) * 2, random(), random())
    }
  }
  const outs = looks.filter((_, i) => i % 4 === 3).sort((a, b) => a - b)
  return { homes: new Float32Array(homes), looks: new Float32Array(looks), moves: new Float32Array(moves), outs }
}

/** How many have landed by this point in the door's swing. */
function landed(outs: number[], fill: number) {
  let low = 0
  let high = outs.length
  while (low < high) {
    const mid = (low + high) >> 1
    if (outs[mid] + FLIGHT <= fill) low = mid + 1
    else high = mid
  }
  return low
}

function quad() {
  const geometry = new InstancedBufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array([-0.5, 0, 0, 0.5, 0, 0, -0.5, 1, 0, 0.5, 1, 0]), 3))
  geometry.setIndex([0, 2, 1, 2, 3, 1])
  return geometry
}

function centredQuad() {
  const geometry = new InstancedBufferGeometry()
  geometry.setAttribute(
    'position',
    new BufferAttribute(new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, -0.5, 0.5, 0, 0.5, 0.5, 0]), 3),
  )
  geometry.setIndex([0, 2, 1, 2, 3, 1])
  return geometry
}

/** Premultiplied "over", for everything on the dance floor. */
function spriteMaterial(vertexShader: string, fragmentShader: string, uniforms: Record<string, IUniform>) {
  return new RawShaderMaterial({
    glslVersion: GLSL3,
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: DoubleSide,
    blending: CustomBlending,
    blendSrc: OneFactor,
    blendDst: OneMinusSrcAlphaFactor,
    blendSrcAlpha: OneFactor,
    blendDstAlpha: OneMinusSrcAlphaFactor,
  })
}

function sheetTexture(image: HTMLImageElement) {
  const texture = new Texture(image)
  texture.flipY = false
  texture.generateMipmaps = true
  texture.minFilter = LinearMipmapLinearFilter
  texture.magFilter = LinearFilter
  texture.needsUpdate = true
  return texture
}

function renderer(canvas: HTMLCanvasElement) {
  const gl = new WebGLRenderer({
    canvas,
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'high-performance',
  })
  gl.setClearColor(0x000000, 0)
  return gl
}

/**
 * The conga line: Casa at the front, mates joining one by one, parading along the top of the crowd. It keeps to the
 * floor whatever the pointer does, out of the way of whatever you're reading.
 */
class Conga {
  private trail: number[] = []
  private dancers: { x: number; y: number; facing: number; cell: number; tint: number; size: number; alpha: number }[] = []
  private joinIn = 0.6
  private head = { x: 0, y: 0 }
  private readonly max: number
  private readonly random: () => number

  constructor(max: number, random: () => number) {
    this.max = max
    this.random = random
  }

  /** Where Casa, at the front, has got to. */
  get leader() {
    return this.head
  }

  /** Moves the front of the line on, laying the path the rest follow. */
  private lead(x: number, y: number) {
    const n = this.trail.length
    if (!n || Math.hypot(x - this.trail[n - 2], y - this.trail[n - 1]) > 6) {
      this.trail.push(x, y)
      if (this.trail.length > 400) this.trail.splice(0, this.trail.length - 400)
    }
    this.head = { x, y }
  }

  /** The spot `distance` behind the head along its path. */
  private behind(distance: number) {
    let remaining = distance
    let { x, y } = this.head
    for (let i = this.trail.length - 2; i >= 0; i -= 2) {
      const px = this.trail[i]
      const py = this.trail[i + 1]
      const step = Math.hypot(x - px, y - py)
      if (step >= remaining) {
        const t = remaining / step
        return { x: x + (px - x) * t, y: y + (py - y) * t }
      }
      remaining -= step
      x = px
      y = py
    }
    return { x, y }
  }

  update(
    seconds: number,
    time: number,
    stage: { width: number; height: number; floorTop: number; open: boolean },
    leaving: { x: number; y: number } | null,
  ) {
    // Along the top of the crowd, swinging from one side to the other.
    this.lead(stage.width * (0.5 + 0.42 * Math.sin(time * 0.23)), stage.floorTop - 30 + 14 * Math.sin(time * 0.61))
    if (stage.open && !leaving && this.dancers.length < this.max) {
      this.joinIn -= seconds
      if (this.joinIn <= 0) {
        this.joinIn = 0.28
        const first = this.dancers.length === 0
        this.dancers.push({
          x: this.head.x + (this.random() - 0.5) * 120,
          y: stage.height + 40,
          facing: 1,
          cell: first ? 0 : 1 + Math.floor(this.random() * 11),
          tint: first ? 0 : [1, 2, 0, 3][Math.floor(this.random() * 4)],
          size: first ? 60 : 40 + this.random() * 10,
          alpha: 1,
        })
      }
    }
    this.dancers.forEach((dancer, i) => {
      const target = leaving ?? this.behind(34 + i * 33)
      const pull = 1 - Math.exp(-seconds * (leaving ? 5 : 8))
      const dx = target.x - dancer.x
      dancer.x += dx * pull
      dancer.y += (target.y - dancer.y) * pull
      if (Math.abs(dx) > 0.6) dancer.facing = dx > 0 ? 1 : -1
      if (leaving) dancer.alpha = clamp01(dancer.alpha - seconds * 0.8)
    })
  }

  /** Writes the dancers into the instance buffers; returns how many there are. */
  write(place: Float32Array, look: Float32Array, beat: number, energy: number, still: boolean) {
    this.dancers.forEach((dancer, i) => {
      const t = still ? 0.2 : (beat + i * 0.12) % 1
      const hop = 4 * t * (1 - t)
      const side = Math.floor(beat + i * 0.5) % 2 ? 1 : -1
      place.set([dancer.x, dancer.y - hop * (5 + 8 * energy), dancer.size, still ? 0 : side * 0.11], i * 4)
      look.set([dancer.cell, dancer.tint, dancer.facing, dancer.alpha], i * 4)
    })
    return this.dancers.length
  }
}

export async function createScene(
  roomCanvas: HTMLCanvasElement,
  frontCanvas: HTMLCanvasElement,
  options: SceneOptions,
): Promise<ClubScene> {
  const image = new Image()
  image.src = SHEET
  await image.decode()

  let width = document.documentElement.clientWidth
  let height = window.innerHeight
  const quality = chooseQuality(width)
  const still = options.reducedMotion
  const crowd = layoutCrowd(width, quality)
  const floorHeight = () => Math.round(Math.min(230, Math.max(110, height * (width < 700 ? 0.17 : 0.21))))

  // Shared uniforms: the lights are the same in both canvases.
  const res = { value: [width, height] }
  const beams = { value: new Float32Array(24) }
  const beamTints = { value: new Float32Array(18) }
  const spot = { value: new Float32Array(3) }
  const beat = { value: 0 }
  const energy = { value: 0.4 }
  const drop = { value: 0 }
  const clubLevel = { value: 0 }
  const time = { value: 0 }
  const spin = { value: 0 }
  const ball = { value: 0 }

  // The room, behind the page.
  const roomRenderer = renderer(roomCanvas)
  const roomTexture = sheetTexture(image)
  const roomGeometry = new BufferGeometry()
  roomGeometry.setAttribute('position', new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3))
  const gobos = { value: new Float32Array(12) }
  const goboLooks = { value: new Float32Array(9) }
  const roomMaterial = new RawShaderMaterial({
    glslVersion: GLSL3,
    vertexShader: roomVertex,
    fragmentShader: roomFragment,
    uniforms: {
      uRes: res,
      uBeams: beams,
      uBeamTints: beamTints,
      uSpot: spot,
      uSheet: { value: roomTexture },
      uTime: time,
      uBeat: beat,
      uEnergy: energy,
      uDrop: drop,
      uClub: clubLevel,
      uSpin: spin,
      uBall: ball,
      uGobos: gobos,
      uGoboLooks: goboLooks,
    },
    blending: NoBlending,
    depthTest: false,
    depthWrite: false,
  })
  const roomMesh = new Mesh(roomGeometry, roomMaterial)
  roomMesh.frustumCulled = false
  const roomScene = new Scene()
  roomScene.add(roomMesh)

  // The dance floor, in front.
  const frontRenderer = renderer(frontCanvas)
  const frontTexture = sheetTexture(image)
  const fill = { value: 0 }
  const sink = { value: 0 }
  const door = { value: [-80, height - 80] }
  const walkway = { value: [-999, 0] }
  const floorUniform = { value: floorHeight() }

  const crowdGeometry = quad()
  crowdGeometry.setAttribute('aHome', new InstancedBufferAttribute(crowd.homes, 4))
  crowdGeometry.setAttribute('aLook', new InstancedBufferAttribute(crowd.looks, 4))
  crowdGeometry.setAttribute('aMove', new InstancedBufferAttribute(crowd.moves, 4))
  crowdGeometry.instanceCount = crowd.homes.length / 4
  const crowdMaterial = spriteMaterial(crowdVertex, spriteFragment, {
    uRes: res,
    uBeams: beams,
    uBeamTints: beamTints,
    uSpot: spot,
    uSheet: { value: frontTexture },
    uBeat: beat,
    uEnergy: energy,
    uFill: fill,
    uDrop: drop,
    uSink: sink,
    uClub: clubLevel,
    uFloor: floorUniform,
    uSizes: { value: quality.sizes },
    uDoor: door,
    uWalkway: walkway,
  })
  const crowdMesh = new Mesh(crowdGeometry, crowdMaterial)
  crowdMesh.frustumCulled = false

  const congaPlace = new Float32Array(quality.conga * 4)
  const congaLook = new Float32Array(quality.conga * 4)
  const congaGeometry = quad()
  const congaPlaceAttribute = new InstancedBufferAttribute(congaPlace, 4)
  const congaLookAttribute = new InstancedBufferAttribute(congaLook, 4)
  congaGeometry.setAttribute('aPlace', congaPlaceAttribute)
  congaGeometry.setAttribute('aLook', congaLookAttribute)
  congaGeometry.instanceCount = 0
  const congaMaterial = spriteMaterial(congaVertex, spriteFragment, {
    uRes: res,
    uBeams: beams,
    uBeamTints: beamTints,
    uSpot: spot,
    uSheet: { value: frontTexture },
  })
  const congaMesh = new Mesh(congaGeometry, congaMaterial)
  congaMesh.frustumCulled = false

  const confetti = 170
  const particleCount = quality.specks + confetti
  const random = seeded(77)
  const seeds = new Float32Array(particleCount * 4).map(() => random())
  const kinds = new Float32Array(particleCount).map((_, i) => (i < quality.specks ? 0 : 1))
  const particleGeometry = centredQuad()
  particleGeometry.setAttribute('aSeed', new InstancedBufferAttribute(seeds, 4))
  particleGeometry.setAttribute('aKind', new InstancedBufferAttribute(kinds, 1))
  particleGeometry.instanceCount = particleCount
  const burst = { value: 99 }
  const particleMaterial = spriteMaterial(particleVertex, particleFragment, {
    uRes: res,
    uTime: time,
    uSpin: spin,
    uBall: ball,
    uBurst: burst,
  })
  const particleMesh = new Mesh(particleGeometry, particleMaterial)
  particleMesh.frustumCulled = false

  const frontScene = new Scene()
  frontScene.add(crowdMesh, particleMesh, congaMesh)
  const camera = new Camera()

  const conga = new Conga(still ? 0 : quality.conga, seeded(5))

  const resize = () => {
    width = document.documentElement.clientWidth
    height = window.innerHeight
    res.value = [width, height]
    floorUniform.value = floorHeight()
    roomRenderer.setPixelRatio(quality.roomScale)
    roomRenderer.setSize(width, height, false)
    frontRenderer.setPixelRatio(quality.frontRatio)
    frontRenderer.setSize(width, height, false)
  }
  resize()

  // Input: the pointer, from anywhere on the page (the canvases let it through), for the follow-spot.
  const pointer = { x: width / 2, y: height / 2, mouse: false, at: -Infinity }
  const onPointer = (event: PointerEvent) => {
    pointer.x = event.clientX
    pointer.y = event.clientY
    pointer.mouse = event.pointerType === 'mouse'
    pointer.at = performance.now()
  }
  const onPointerOut = (event: PointerEvent) => {
    if (!event.relatedTarget) pointer.at = -Infinity
  }
  window.addEventListener('pointermove', onPointer, { passive: true })
  window.addEventListener('pointerdown', onPointer, { passive: true })
  document.addEventListener('pointerout', onPointerOut)
  window.addEventListener('resize', resize)

  // The beat: 122 to the minute, the same as Casa Radio's grooves, and nudged onto the radio's kick when it's on.
  let lastPulse = 0
  let phraseStart = 0
  let wasOpen = false
  let scrollY = window.scrollY
  let scrollSpeed = 0
  let pointerPresence = 0
  let leaving: { started: number; toDoor: boolean; resolve: () => void } | null = null
  let insideAt = 0
  let slowFrames = 0
  let downgraded = false
  let gone = false
  let cleared = false

  const fire = (big: boolean) => {
    if (still) return
    drop.value = 1
    if (big) burst.value = 0
    options.onDrop?.(big)
  }

  const aim = (b: number, i: number) => {
    const sweep = 0.62 * Math.sin((2 * Math.PI * b) / 16 + i * 0.9)
    const fan = (i - 2.5) * 0.17 * (1 + 0.25 * Math.sin((2 * Math.PI * b) / 32))
    const cross = (i % 2 ? 1 : -1) * 0.48 * Math.sin((2 * Math.PI * b) / 8 + 0.6)
    const patterns = [sweep, fan, cross]
    const section = Math.floor(b / 32)
    const into = smooth((b % 32) / 4)
    return patterns[(section + 2) % 3] * (1 - into) + patterns[section % 3] * into
  }

  const doorPoint = () => {
    const box = options.door()
    if (!box || !box.width) return null
    return { x: box.left + box.width / 2, y: box.bottom - box.height * 0.3, inSight: box.bottom > 0 && box.top < height }
  }

  const frame = (seconds: number) => {
    if (gone) return
    const phase = club.phase
    if (!still) time.value += seconds

    // Leaving: the door's swing runs backwards and they fly home through it, or they all duck out of view.
    let fillValue = phase === 'open' ? 1 : club.progress
    if (leaving) {
      const t = (performance.now() - leaving.started) / 1000
      if (leaving.toDoor) fillValue = 1 - smooth(t / 1.5)
      else sink.value = smooth(t / 1.1)
      if (t > (leaving.toDoor ? 1.6 : 1.2)) {
        // Everyone's out: clear both canvases and stop drawing.
        gone = true
        roomRenderer.clear()
        frontRenderer.clear()
        leaving.resolve()
        return
      }
    }
    fill.value = still ? (fillValue > 0 ? 1 : 0) : fillValue

    // The beat, the room's energy, and the drops.
    if (!still) beat.value += (seconds * GROOVE_BPM) / 60
    const pulse = casaSound.pulse()
    if (pulse > 0.6 && lastPulse < 0.35) beat.value -= (beat.value - Math.round(beat.value)) * 0.5
    lastPulse = pulse
    const y = window.scrollY
    scrollSpeed = damp(scrollSpeed, Math.abs(y - scrollY) / Math.max(seconds, 1e-3), 4, seconds)
    scrollY = y
    const open = phase === 'open'
    if (open && !wasOpen) {
      phraseStart = Math.ceil(beat.value)
      fire(true)
    }
    wasOpen = open
    const intoPhrase = beat.value - phraseStart
    const build = open ? smooth((intoPhrase - 48) / 16) : 0
    if (open && intoPhrase >= PHRASE) {
      phraseStart += PHRASE
      fire(false)
    }
    drop.value *= Math.exp(-seconds * 2.6)
    burst.value += seconds
    const target = still ? 0 : 0.38 + 0.55 * clamp01(scrollSpeed / 2200) + 0.25 * build + 0.2 * clamp01(pulse * 1.5)
    energy.value = damp(energy.value, target, 2.5, seconds)

    // Lights down as the door opens; all the way once you're in; up again when you leave.
    const lightsTarget = leaving ? 0 : open ? 1 : club.progress * 0.55
    clubLevel.value = damp(clubLevel.value, lightsTarget, leaving ? 1.8 : 2.2, seconds)
    ball.value = damp(ball.value, open && !leaving ? 1 : 0, 1.4, seconds)
    spin.value += seconds * (still ? 0 : 0.25 + 0.35 * energy.value)

    // The moving heads.
    const fraction = beat.value % 1
    const kick = Math.max(pulse, fraction < 0.06 ? fraction / 0.06 : Math.exp(-(fraction - 0.06) * 6))
    for (let i = 0; i < 6; i++) {
      const wave = 0.5 + 0.5 * Math.cos(2 * Math.PI * (beat.value / 4 - i / 6))
      const strength = clubLevel.value * (0.36 + 0.24 * energy.value + 0.18 * kick * (still ? 0 : 1)) * (0.6 + 0.4 * wave) + 0.5 * drop.value
      beams.value.set([((i + 0.5) / 6) * width, aim(beat.value, i) + build * 0.08 * Math.sin(2 * Math.PI * beat.value), strength, 0.085 + 0.03 * energy.value + 0.06 * drop.value], i * 4)
      beamTints.value.set(i % 2 ? CREAM : ORANGE, i * 3)
    }

    // Gobos: Casa, the star and the spiral sun, drifting over the walls.
    const t = still ? 0 : time.value
    const goboSize = Math.min(width, height) * 0.36
    ;[0, 7, 11].forEach((cell, i) => {
      gobos.value.set(
        [
          width * (0.5 + 0.38 * Math.sin(t * 0.11 * (1 + i * 0.3) + i * 2.1)),
          height * (0.42 + 0.26 * Math.sin(t * 0.17 * (1 + i * 0.2) + i)),
          goboSize * (1 + i * 0.25),
          t * 0.15 * (i % 2 ? 1 : -1),
        ],
        i * 4,
      )
      goboLooks.value.set([cell, 0.38 * clubLevel.value, i % 2], i * 3)
    })

    // The pointer: a follow-spot to read by. The crowd and the conga line pay it no attention.
    const recent = performance.now() - pointer.at < 3000 ? 1 : 0
    pointerPresence = damp(pointerPresence, recent, 3, seconds)
    spot.value.set([pointer.x, pointer.y, pointer.mouse ? 0.55 * clubLevel.value * pointerPresence : 0])

    // The doorway, wherever the page has scrolled it. While it's down among the crowd, they keep it clear.
    const doorway = doorPoint()
    if (doorway) door.value = [doorway.x, doorway.y]
    const crowded = doorway ? smooth((doorway.y - (height - floorUniform.value - 60)) / 120) : 0
    walkway.value = [doorway?.x ?? -999, damp(walkway.value[1], leaving ? 0 : crowded, 3, seconds)]

    // The conga line.
    const floorTop = height - floorUniform.value
    conga.update(seconds, time.value, { width, height, floorTop, open: open && !still }, leaving ? (leaving.toDoor && doorway ? doorway : { x: conga.leader.x, y: height + 140 }) : null)
    congaGeometry.instanceCount = conga.write(congaPlace, congaLook, beat.value, energy.value, still)
    congaPlaceAttribute.needsUpdate = true
    congaLookAttribute.needsUpdate = true

    // How many are inside, for the club bar.
    if (time.value - insideAt > 0.12) {
      insideAt = time.value
      club.setInside(landed(crowd.outs, fill.value) + congaGeometry.instanceCount)
    }

    // Nothing to see (the door swung shut again before anyone got out): clear once, then rest.
    const idle = !open && fill.value === 0 && clubLevel.value < 0.002 && congaGeometry.instanceCount === 0
    if (idle) {
      if (!cleared) {
        roomRenderer.clear()
        frontRenderer.clear()
        cleared = true
      }
      return
    }
    cleared = false
    roomRenderer.render(roomScene, camera)
    frontRenderer.render(frontScene, camera)

    // If the frames are slow once the club's full, render less finely.
    if (open && !downgraded) {
      slowFrames = seconds > 1 / 40 ? slowFrames + 1 : Math.max(0, slowFrames - 1)
      if (slowFrames > 45) {
        downgraded = true
        quality.roomScale = Math.max(0.3, quality.roomScale - 0.15)
        quality.frontRatio = 1
        resize()
      }
    }
  }

  const stop = club.onTick(frame)

  return {
    leave() {
      return new Promise<void>((resolve) => {
        const doorway = doorPoint()
        leaving = { started: performance.now(), toDoor: Boolean(doorway?.inSight) && !still, resolve }
      })
    },
    drop: () => fire(true),
    floor: () => floorUniform.value,
    dispose() {
      stop()
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('pointerout', onPointerOut)
      window.removeEventListener('resize', resize)
      for (const geometry of [roomGeometry, crowdGeometry, congaGeometry, particleGeometry]) geometry.dispose()
      for (const material of [roomMaterial, crowdMaterial, congaMaterial, particleMaterial]) material.dispose()
      roomTexture.dispose()
      frontTexture.dispose()
      for (const gl of [roomRenderer, frontRenderer]) {
        gl.dispose()
        gl.forceContextLoss()
      }
    },
  }
}
