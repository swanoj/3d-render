import { useEffect, useId, useRef } from 'react'
import { palette } from '../brand/brand'
import { cannotHover, gsap, prefersReducedMotion, ScrollTrigger, seeded, useGSAP } from '../lib/gsap'
import { markUrl } from '../lib/marks'
import { useCopy } from '../lib/useSite'

/*
 * The little shows behind Tickets, Birthdays and Booths. Each is an SVG scene built from the official marks (Casa,
 * the logo, the emblem), recoloured with a flood filter, and a GSAP timeline that plays forward on hover (or as it
 * scrolls into view on a touch screen) and rewinds when the pointer leaves.
 *
 *   Tickets    a Club Casa ticket rises out of a slot, Casa's stamp thuds onto it and the stub tears away.
 *   Birthdays  bunting drops in, Casa pops up in a party hat and the confetti goes off.
 *   Booths     the velvet rope unhooks, Casa walks in and sits down, the lamp comes on, the card says Reserved.
 */

export type PlanKind = 'tickets' | 'birthdays' | 'booths'

const { orange, charcoal, stone, cream } = palette
const MASCOT = { href: markUrl('mascot'), ratio: 314 / 319 }
const LOGO = { href: markUrl('logo'), ratio: 225 / 1664 }
const EMBLEM = { href: markUrl('emblem'), ratio: 212 / 257 }
const TINTS = { orange, charcoal, stone, cream } as const
type Tint = keyof typeof TINTS

const HAND = '"Felt Tip Senior", "Marker Felt", cursive'
const BOLD = '"Helvetica Neue", Helvetica, Arimo, Arial, sans-serif'
const MONO = '"Roboto Mono", ui-monospace, monospace'

/** Flood filters that recolour a charcoal mark to any palette colour, keeping its exact shape. */
function Tints({ id }: { id: string }) {
  return (
    <>
      {(Object.keys(TINTS) as Tint[]).map((name) => (
        <filter key={name} id={`${id}-${name}`} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feFlood floodColor={TINTS[name]} result="ink" />
          <feComposite in="ink" in2="SourceAlpha" operator="in" />
        </filter>
      ))}
    </>
  )
}

/** One of the official marks inside a scene, in a palette colour. */
function MarkImage({ mark, x, y, width, tint, id, className }: {
  mark: { href: string; ratio: number }
  x: number
  y: number
  width: number
  tint: Tint
  id: string
  className?: string
}) {
  return (
    <image
      href={mark.href}
      x={x}
      y={y}
      width={width}
      height={width * mark.ratio}
      filter={`url(#${id}-${tint})`}
      className={className}
      preserveAspectRatio="xMidYMid meet"
    />
  )
}

/** A scene's timeline, the loop it settles into once it has played, and how to clear that loop. */
interface SceneShow {
  tl: gsap.core.Timeline
  idle: () => gsap.core.Animation
  reset: () => void
}

/* ---------- Tickets ---------- */

// The ticket's outline, with half-moon notches where the perforation runs (x = 226).
const TICKET_BODY = 'M44 34 H217 A9 9 0 0 0 226 43 V141 A9 9 0 0 0 217 150 H44 Q34 150 34 140 V44 Q34 34 44 34 Z'
const TICKET_STUB = 'M226 43 A9 9 0 0 0 235 34 H280 Q290 34 290 44 V140 Q290 150 280 150 H235 A9 9 0 0 0 226 141 Z'

const BARCODE = (() => {
  const random = seeded(24)
  const bars: { x: number; w: number }[] = []
  for (let x = 54; x < 132; ) {
    const w = random() < 0.35 ? 2.4 : 1.1
    bars.push({ x, w })
    x += w + 1.4 + random() * 1.6
  }
  return bars
})()

function TicketScene({ id }: { id: string }) {
  const { hours, venue } = useCopy()
  return (
    <>
      <defs>
        <Tints id={id} />
        {/* Everything above the slot: the ticket appears out of it. */}
        <clipPath id={`${id}-slot`}>
          <rect x="-40" y="-80" width="400" height="245" />
        </clipPath>
        <path id={`${id}-ring`} d="M-21 0 a21 21 0 1 1 42 0 a21 21 0 1 1 -42 0" fill="none" />
      </defs>
      <g clipPath={`url(#${id}-slot)`}>
        <g className="tk-float">
          <g className="tk-ticket">
            <g className="tk-body">
              <path d={TICKET_BODY} fill={orange} />
              <text x="52" y="58" fill={cream} style={{ font: `700 8.5px ${BOLD}`, letterSpacing: '2.2px' }}>
                ADMIT ONE
              </text>
              <MarkImage mark={LOGO} x={51} y={66} width={142} tint="cream" id={id} />
              <text x="52" y="106" fill={cream} style={{ font: `500 8.4px ${MONO}`, letterSpacing: '0.6px' }}>
                EVERY SATURDAY
              </text>
              <text x="52" y="118" fill={cream} opacity="0.85" style={{ font: `400 7px ${MONO}`, letterSpacing: '0.4px' }}>
                {`${hours.time} · ${venue.host}`.toUpperCase()}
              </text>
              {BARCODE.map((bar) => (
                <rect key={bar.x} x={bar.x} y="127" width={bar.w} height="13" fill={cream} opacity="0.9" />
              ))}
            </g>
            <line className="tk-perf" x1="226" y1="47" x2="226" y2="137" stroke={cream} strokeWidth="1.6" strokeDasharray="3.5 3.5" opacity="0.7" />
            <g className="tk-stub">
              <path d={TICKET_STUB} fill={orange} />
              <MarkImage mark={EMBLEM} x={246} y={46} width={24} tint="cream" id={id} />
              <text transform="translate(262 128) rotate(-90)" fill={cream} style={{ font: `500 9px ${MONO}`, letterSpacing: '1.2px' }}>
                Nº 0024
              </text>
            </g>
            {/* Casa's rubber stamp, inked in charcoal. */}
            <g transform="translate(182 104)">
              <g className="tk-stamp">
                {/* The ink's own opacity sits on an inner group: GSAP's autoAlpha sets the outer one's. */}
                <g opacity="0.92">
                  <circle r="28" fill="none" stroke={charcoal} strokeWidth="2.4" />
                  <circle r="17" fill="none" stroke={charcoal} strokeWidth="1" />
                  <text fill={charcoal} style={{ font: `700 6.2px ${BOLD}`, letterSpacing: '1.4px' }}>
                    <textPath href={`#${id}-ring`} startOffset="0">
                      CASA ★ APPROVED ★ CLUB CASA ★
                    </textPath>
                  </text>
                  <MarkImage mark={MASCOT} x={-13} y={-13} width={26} tint="charcoal" id={id} />
                </g>
              </g>
            </g>
            {[
              [214, 82, 2.2],
              [150, 128, 1.6],
              [206, 132, 1.3],
              [154, 84, 1.1],
            ].map(([x, y, r]) => (
              <circle key={`${x}-${y}`} className="tk-ink" cx={x} cy={y} r={r} fill={charcoal} opacity="0.85" />
            ))}
          </g>
        </g>
      </g>
      <rect x="20" y="163" width="280" height="11" rx="5.5" className="art-slot" />
      <rect x="40" y="166" width="240" height="2" rx="1" fill={cream} opacity="0.12" />
    </>
  )
}

function ticketTimeline(root: SVGSVGElement): SceneShow {
  const q = gsap.utils.selector(root)
  gsap.set(q('.tk-ticket'), { y: 102, rotation: 0, transformOrigin: '50% 100%' })
  gsap.set(q('.tk-stamp'), { autoAlpha: 0, scale: 2.4, rotation: -38, transformOrigin: '50% 50%' })
  gsap.set(q('.tk-stub'), { x: 0, y: 0, rotation: 0, transformOrigin: '0% 50%' })
  gsap.set(q('.tk-ink'), { scale: 0, transformOrigin: '50% 50%' })
  const tl = gsap.timeline({ paused: true })
  tl.to(q('.tk-ticket'), { y: 0, rotation: -3, duration: 0.55, ease: 'back.out(1.5)' }, 0)
    .to(q('.tk-stamp'), { autoAlpha: 1, scale: 1, rotation: -12, duration: 0.2, ease: 'power4.in' }, 0.42)
    .to(q('.tk-ticket'), { x: 2.5, duration: 0.045, yoyo: true, repeat: 3, ease: 'none' }, 0.62)
    .to(q('.tk-ink'), { scale: 1, duration: 0.2, stagger: 0.025, ease: 'back.out(3)' }, 0.62)
    .to(q('.tk-perf'), { opacity: 0, duration: 0.15 }, 0.8)
    .to(q('.tk-stub'), { x: 16, y: 7, rotation: 10, duration: 0.5, ease: 'power3.out' }, 0.8)
  const idle = () =>
    gsap.to(q('.tk-float'), { y: -3, rotation: 0.6, duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: -1, transformOrigin: '50% 100%' })
  return { tl, idle, reset: () => gsap.set(q('.tk-float'), { y: 0, rotation: 0 }) }
}

/* ---------- Birthdays ---------- */

const FLAG_COLOURS = [orange, cream, stone, orange, cream, stone, orange, cream, stone]

/** Points along the bunting's string (a quadratic curve), with the angle of the string at each. */
const FLAGS = FLAG_COLOURS.map((colour, i) => {
  const t = (i + 0.5) / FLAG_COLOURS.length
  const [p0, p1, p2] = [
    [6, 10],
    [160, 58],
    [314, 10],
  ]
  const x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t ** 2 * p2[0]
  const y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t ** 2 * p2[1]
  const dx = 2 * (1 - t) * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0])
  const dy = 2 * (1 - t) * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1])
  return { colour, x, y, angle: (Math.atan2(dy, dx) * 180) / Math.PI }
})

const CONFETTI = (() => {
  const random = seeded(16)
  const colours = [orange, cream, stone, orange, cream, charcoal]
  return Array.from({ length: 30 }, (_, i) => ({
    shape: i % 4,
    colour: colours[i % colours.length],
    // Where it flies to, how far it then falls and how much it spins.
    dx: (random() - 0.5) * 300,
    dy: -30 - random() * 92,
    fall: 70 + random() * 70,
    spin: (random() - 0.5) * 900,
  }))
})()

// Casa stands in the middle with feet on the bottom edge; the hat sits on the middle of the three top lobes.
const CASA_BD = { x: 108, y: 98, width: 104 }
const HAT = { x: CASA_BD.width * (160 / 319), y: 4 }

function BirthdayScene({ id }: { id: string }) {
  return (
    <>
      <defs>
        <Tints id={id} />
        <clipPath id={`${id}-hat`}>
          <path d="M-13 4 L0 -30 L13 4 Z" />
        </clipPath>
      </defs>
      <g className="bd-bunting">
        <path d="M6 10 Q160 58 314 10" fill="none" stroke={stone} strokeWidth="1.4" opacity="0.8" />
        {FLAGS.map((flag, i) => (
          <g key={i} transform={`translate(${flag.x.toFixed(1)} ${flag.y.toFixed(1)}) rotate(${flag.angle.toFixed(1)})`}>
            <path className="bd-flag" d="M-9 0 L9 0 L0 17 Z" fill={flag.colour} />
          </g>
        ))}
      </g>
      <g className="bd-bits" transform={`translate(160 ${CASA_BD.y + 6})`}>
        {CONFETTI.map((bit, i) => {
          const common = { className: 'bd-bit', fill: bit.colour, 'data-i': i }
          if (bit.shape === 0) return <rect key={i} {...common} x="-3.5" y="-1.6" width="7" height="3.2" rx="0.6" />
          if (bit.shape === 1) return <circle key={i} {...common} r="2.4" />
          if (bit.shape === 2) return <path key={i} {...common} d="M-3 2 L0 -3 L3 2 Z" />
          return (
            <path key={i} className="bd-bit" data-i={i} d="M-5 0 q1.6 -3 3.2 0 t3.2 0 t3.2 0" fill="none" stroke={bit.colour} strokeWidth="1.5" strokeLinecap="round" />
          )
        })}
      </g>
      {/* Placed by the outer group; GSAP moves the inner one (it takes over a group's own translate). */}
      <g transform={`translate(${CASA_BD.x} ${CASA_BD.y})`}>
        <g className="bd-casa">
          <g className="bd-casa-inner">
            <MarkImage mark={MASCOT} x={0} y={0} width={CASA_BD.width} tint="orange" id={id} />
            <g transform={`translate(${HAT.x.toFixed(1)} ${HAT.y})`}>
              <g className="bd-hat">
                <path d="M-13 4 L0 -30 L13 4 Z" fill={cream} />
                <g clipPath={`url(#${id}-hat)`}>
                  {[-26, -16, -6, 4].map((y) => (
                    <path key={y} d={`M-16 ${y + 10} L16 ${y}`} stroke={charcoal} strokeWidth="3" />
                  ))}
                </g>
                <circle cx="0" cy="-31" r="5" fill={cream} stroke={charcoal} strokeWidth="1.2" />
                <path d="M-15 4 Q0 9 15 4" fill="none" stroke={charcoal} strokeWidth="2" strokeLinecap="round" />
              </g>
            </g>
          </g>
        </g>
      </g>
      <g transform="translate(212 74)">
        <g className="bd-bubble">
          <path d="M0 0 Q-4 -24 30 -26 Q66 -26 62 -10 Q60 4 22 2 Q12 2 2 10 Q6 4 0 0 Z" fill={cream} stroke={charcoal} strokeWidth="1.4" />
          <text x="31" y="-8" textAnchor="middle" fill={charcoal} style={{ font: `400 14px ${HAND}` }}>
            hooray!
          </text>
        </g>
      </g>
    </>
  )
}

function birthdayTimeline(root: SVGSVGElement): SceneShow {
  const q = gsap.utils.selector(root)
  gsap.set(q('.bd-casa'), { y: 90, scaleY: 1, transformOrigin: '50% 100%' })
  gsap.set(q('.bd-hat'), { rotation: 0, transformOrigin: '50% 100%' })
  gsap.set(q('.bd-bunting'), { y: -72 })
  gsap.set(q('.bd-bit'), { x: 0, y: 0, scale: 0, rotation: 0, opacity: 1 })
  gsap.set(q('.bd-bubble'), { scale: 0, transformOrigin: '0% 100%' })
  const tl = gsap.timeline({ paused: true })
  tl.to(q('.bd-bunting'), { y: 0, duration: 0.8, ease: 'elastic.out(1, 0.5)' }, 0)
    .to(q('.bd-casa'), { y: -8, duration: 0.36, ease: 'power3.out' }, 0.06)
    .to(q('.bd-casa'), { y: 0, scaleY: 0.88, duration: 0.12, ease: 'power1.in' }, 0.42)
    .to(q('.bd-casa'), { scaleY: 1, duration: 0.45, ease: 'elastic.out(1, 0.4)' }, 0.54)
    .fromTo(q('.bd-hat'), { rotation: -26 }, { rotation: 0, duration: 0.8, ease: 'elastic.out(1.2, 0.35)', immediateRender: false }, 0.3)
  q('.bd-bit').forEach((bit) => {
    const piece = CONFETTI[Number(bit.getAttribute('data-i'))]
    tl.to(bit, { x: piece.dx, y: piece.dy, scale: 1, rotation: piece.spin / 2, duration: 0.55, ease: 'power3.out' }, 0.44)
    tl.to(bit, { y: piece.dy + piece.fall, rotation: piece.spin, opacity: 0, duration: 1, ease: 'power1.in' }, 0.99)
  })
  tl.to(q('.bd-bubble'), { scale: 1, duration: 0.35, ease: 'back.out(2.4)' }, 0.72)
  const idle = () =>
    gsap
      .timeline({ repeat: -1 })
      .to(q('.bd-casa-inner'), { rotation: -4, duration: 0.42, ease: 'steps(1)', transformOrigin: '50% 100%' })
      .to(q('.bd-casa-inner'), { rotation: 4, duration: 0.42, ease: 'steps(1)' })
      .add(gsap.to(q('.bd-flag'), { rotation: 8, duration: 0.84, ease: 'sine.inOut', yoyo: true, repeat: 1, stagger: 0.06, transformOrigin: '50% 0%' }), 0)
  return { tl, idle, reset: () => gsap.set([...q('.bd-casa-inner'), ...q('.bd-flag')], { rotation: 0 }) }
}

/* ---------- Booths ---------- */

const TUFTS = [78, 104, 130, 156, 182, 208, 234]
const BUTTONS = TUFTS.flatMap((x) => [70, 100].map((y) => ({ x: x + 13, y })))

function BoothScene({ id }: { id: string }) {
  return (
    <>
      <defs>
        <Tints id={id} />
        <radialGradient id={`${id}-glow`}>
          <stop offset="0" stopColor={orange} stopOpacity="0.85" />
          <stop offset="0.45" stopColor={orange} stopOpacity="0.3" />
          <stop offset="1" stopColor={orange} stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${id}-back`}>
          <path d="M52 150 V92 Q52 42 104 38 H216 Q268 42 268 92 V150 Z" />
        </clipPath>
      </defs>
      {/* The booth: a tufted velvet back, the seat and its plinth. */}
      <path d="M52 150 V92 Q52 42 104 38 H216 Q268 42 268 92 V150 Z" fill={orange} />
      <g clipPath={`url(#${id}-back)`} stroke={charcoal} strokeWidth="1.2" opacity="0.25">
        {TUFTS.map((x) => (
          <line key={x} x1={x} y1="30" x2={x} y2="150" />
        ))}
      </g>
      {BUTTONS.map((button) => (
        <circle key={`${button.x}-${button.y}`} cx={button.x} cy={button.y} r="1.8" fill={charcoal} opacity="0.4" />
      ))}
      <g className="bt-glow-wrap">
        <circle className="bt-glow" cx="190" cy="118" r="78" fill={`url(#${id}-glow)`} />
      </g>
      <g transform="translate(196 92)">
        <g className="bt-casa">
          <g className="bt-casa-inner">
            <MarkImage mark={MASCOT} x={0} y={0} width={60} tint="cream" id={id} />
          </g>
        </g>
      </g>
      <rect x="44" y="134" width="232" height="20" rx="9" fill={orange} />
      <rect x="44" y="134" width="232" height="20" rx="9" fill={charcoal} opacity="0.2" />
      <rect x="50" y="153" width="220" height="10" rx="3" className="art-slot" />
      {/* The table, the mushroom lamp and the Reserved card. */}
      <ellipse cx="148" cy="151" rx="48" ry="9" fill={cream} />
      <rect x="144" y="151" width="8" height="34" fill={stone} />
      <ellipse cx="148" cy="186" rx="22" ry="4" fill={stone} />
      <rect x="168" y="126" width="4" height="23" rx="1" fill={stone} />
      <path d="M156 128 Q170 104 184 128 Z" fill={cream} />
      <path className="bt-lit" d="M156 128 Q170 104 184 128 Z" fill={orange} opacity="0" />
      <g transform="translate(126 148)">
        <g className="bt-card">
          <path d="M-15 0 L-12 -19 H12 L15 0 Z" fill={cream} stroke={stone} strokeWidth="1" />
          <text y="-7" textAnchor="middle" fill={charcoal} style={{ font: `700 4.6px ${BOLD}`, letterSpacing: '0.8px' }}>
            RESERVED
          </text>
        </g>
      </g>
      {/* The velvet rope between its brass posts. */}
      <g className="bt-rope">
        <path d="M42 162 Q160 196 278 162" fill="none" stroke={orange} strokeWidth="5" strokeLinecap="round" />
        <path d="M42 162 Q160 196 278 162" fill="none" stroke={charcoal} strokeWidth="5" strokeLinecap="round" opacity="0.25" strokeDasharray="1 7" />
      </g>
      {[40, 280].map((x) => (
        <g key={x} transform={`translate(${x} 156)`}>
          <rect x="-2.5" y="4" width="5" height="38" fill={stone} />
          <circle cy="4" r="6" fill={cream} />
          <ellipse cy="43" rx="12" ry="3" fill={stone} />
        </g>
      ))}
    </>
  )
}

function boothTimeline(root: SVGSVGElement): SceneShow {
  const q = gsap.utils.selector(root)
  gsap.set(q('.bt-rope'), { rotation: 0, svgOrigin: '42 162' })
  gsap.set(q('.bt-casa'), { x: 150, y: 0, scaleY: 1, rotation: 0, transformOrigin: '50% 100%' })
  gsap.set(q('.bt-glow'), { opacity: 0 })
  gsap.set(q('.bt-lit'), { opacity: 0 })
  gsap.set(q('.bt-card'), { scaleY: 0, transformOrigin: '50% 100%' })
  const tl = gsap.timeline({ paused: true })
  tl.to(q('.bt-rope'), { rotation: 64, svgOrigin: '42 162', duration: 0.75, ease: 'bounce.out' }, 0)
    .to(q('.bt-casa'), { x: 0, duration: 0.62, ease: 'power2.out' }, 0.12)
    .to(q('.bt-casa-inner'), { rotation: 9, duration: 0.11, repeat: 5, yoyo: true, ease: 'steps(1)', transformOrigin: '50% 100%' }, 0.12)
    .to(q('.bt-casa'), { y: 5, scaleY: 0.9, duration: 0.12, ease: 'power2.in' }, 0.76)
    .to(q('.bt-casa'), { y: 0, scaleY: 1, rotation: -7, duration: 0.4, ease: 'back.out(3)' }, 0.88)
    .to(q('.bt-glow'), { keyframes: [{ opacity: 0.75, duration: 0.06 }, { opacity: 0.2, duration: 0.07 }, { opacity: 1, duration: 0.12 }] }, 0.84)
    .to(q('.bt-lit'), { opacity: 0.4, duration: 0.25 }, 0.9)
    .to(q('.bt-card'), { scaleY: 1, duration: 0.42, ease: 'back.out(2.4)' }, 1.02)
  const idle = () =>
    gsap
      .timeline({ repeat: -1, yoyo: true })
      .to(q('.bt-glow-wrap'), { opacity: 0.78, duration: 2.2, ease: 'sine.inOut' })
      .to(q('.bt-casa-inner'), { rotation: -3, duration: 2.2, ease: 'sine.inOut', transformOrigin: '50% 100%' }, 0)
  return { tl, idle, reset: () => gsap.set(q('.bt-glow-wrap'), { opacity: 1 }) }
}

/* ---------- The component ---------- */

const SCENES = {
  tickets: { Scene: TicketScene, build: ticketTimeline, label: 'A Club Casa ticket, stamped by Casa' },
  birthdays: { Scene: BirthdayScene, build: birthdayTimeline, label: 'Casa in a party hat, with bunting and confetti' },
  booths: { Scene: BoothScene, build: boothTimeline, label: 'Casa in a velvet booth with the lamp on' },
}

interface PlanArtProps {
  kind: PlanKind
  /** Plays forward while true, rewinds when it goes false. */
  active: boolean
  /** On touch screens, play once as it scrolls into view. */
  autoplay?: boolean
  className?: string
}

export function PlanArt({ kind, active, autoplay = false, className }: PlanArtProps) {
  const root = useRef<SVGSVGElement>(null)
  const id = `art${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const show = useRef<SceneShow | null>(null)
  const idle = useRef<gsap.core.Animation | null>(null)
  const { Scene, build } = SCENES[kind]

  useGSAP(
    () => {
      const svg = root.current
      if (!svg) return
      const scene = build(svg)
      show.current = scene
      scene.tl.eventCallback('onComplete', () => {
        if (!prefersReducedMotion()) idle.current = scene.idle()
      })
      if (autoplay && cannotHover()) {
        ScrollTrigger.create({
          trigger: svg,
          start: 'top 78%',
          once: true,
          onEnter: () => (prefersReducedMotion() ? scene.tl.progress(1) : scene.tl.play()),
        })
      }
    },
    { scope: root, dependencies: [kind] },
  )

  useEffect(() => {
    const scene = show.current
    if (!scene) return
    if (active) {
      if (prefersReducedMotion()) scene.tl.progress(1)
      else scene.tl.timeScale(1).play()
    } else {
      idle.current?.kill()
      idle.current = null
      scene.reset()
      if (prefersReducedMotion()) scene.tl.progress(0)
      else scene.tl.timeScale(2).reverse()
    }
  }, [active])

  return (
    <svg
      ref={root}
      viewBox="0 0 320 200"
      className={['plan-art', `plan-art--${kind}`, className].filter(Boolean).join(' ')}
      aria-hidden
      overflow="hidden"
    >
      <Scene id={id} />
    </svg>
  )
}
