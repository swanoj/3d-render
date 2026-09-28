import { useId, type CSSProperties, type ReactNode } from 'react'
import type { MotifName } from '../content/types'
import { useInView } from '../lib/useInView'

/*
 * The hand-drawn layer from the concept deck: "simple font as the base, with hand-drawn/scribble details layered
 * around it", "hand-drawn arrows to artists, date/time, specials". Every mark is a pen stroke that draws itself
 * the first time it scrolls into view, roughened by a small displacement filter so it reads as marker, not vector.
 */

const scribbles = {
  arrow: {
    viewBox: '0 0 200 120',
    strokes: ['M12 22 C 48 6, 98 12, 128 40 C 150 60, 160 78, 172 98', 'M146 92 C 156 95, 166 98, 174 101 C 176 90, 177 80, 179 70'],
  },
  'arrow-loop': {
    viewBox: '0 0 200 110',
    strokes: ['M10 70 C 30 26, 64 22, 62 48 C 60 72, 32 68, 38 46 C 46 20, 110 12, 176 34', 'M152 18 L 178 35 L 156 54'],
  },
  /** A long arrow wandering down the page. */
  drop: {
    viewBox: '0 0 80 220',
    strokes: ['M30 6 C 58 36, 12 70, 36 104 C 58 136, 22 168, 42 206', 'M24 186 C 30 194, 36 200, 42 208 C 48 198, 54 190, 62 182'],
  },
  circle: {
    viewBox: '0 0 220 110',
    strokes: ['M40 30 C 80 8, 170 6, 200 34 C 222 56, 190 94, 118 100 C 58 105, 12 86, 14 58 C 16 34, 60 18, 112 14'],
  },
  underline: {
    viewBox: '0 0 220 30',
    strokes: ['M6 18 C 40 10, 70 24, 104 16 C 138 8, 170 22, 214 12'],
  },
  'double-underline': {
    viewBox: '0 0 220 40',
    strokes: ['M8 14 C 60 8, 140 10, 212 12', 'M22 30 C 80 24, 150 26, 200 28'],
  },
  star: {
    viewBox: '0 0 60 60',
    strokes: ['M30 6 L 30 54', 'M9 18 L 51 42', 'M51 18 L 9 42'],
  },
} as const

/** Original doodle stamps, one per night, until the weekly mascot artwork exists. */
const motifs: Record<MotifName, { viewBox: string; strokes: string[] }> = {
  tv: {
    viewBox: '0 0 100 100',
    strokes: [
      'M18 32 C 17 30, 20 28, 24 28 L 80 27 C 84 27, 86 30, 86 34 L 85 78 C 85 82, 82 84, 78 84 L 24 85 C 20 85, 17 82, 17 78 Z',
      'M27 36 L 63 35 C 66 35, 67 37, 67 40 L 66 71 C 66 74, 64 75, 61 75 L 28 76 C 25 76, 24 74, 24 71 L 24 40 C 24 37, 25 36, 27 36 Z',
      'M72 42 C 72 39, 80 39, 80 42 C 80 45, 72 45, 72 42 Z',
      'M72 58 C 72 55, 80 55, 80 58 C 80 61, 72 61, 72 58 Z',
      'M42 27 L 30 10',
      'M56 27 L 70 8',
      'M26 85 L 23 94',
      'M78 84 L 81 93',
    ],
  },
  lamp: {
    viewBox: '0 0 100 100',
    strokes: [
      'M31 18 L 69 17 L 82 47 L 18 48 Z',
      'M50 48 L 50 82',
      'M33 86 C 40 81, 60 81, 67 86 L 67 90 L 33 90 Z',
      'M30 55 L 22 64',
      'M70 55 L 78 64',
      'M50 56 L 50 63',
    ],
  },
  plant: {
    viewBox: '0 0 100 100',
    strokes: [
      'M31 63 L 69 63 L 63 93 L 37 93 Z',
      'M27 63 L 73 63',
      'M50 63 C 50 45, 48 30, 44 14',
      'M49 50 C 36 44, 25 46, 19 35 C 32 31, 44 38, 49 50',
      'M50 41 C 62 33, 74 35, 82 25 C 70 21, 56 27, 50 41',
      'M46 26 C 38 18, 38 10, 42 4 C 50 10, 50 18, 46 26',
    ],
  },
  record: {
    viewBox: '0 0 100 100',
    strokes: [
      'M50 10 C 72 10, 90 28, 90 50 C 90 72, 72 90, 50 90 C 28 90, 10 72, 10 50 C 10 28, 28 10, 50 10 Z',
      'M50 22 C 66 22, 78 34, 78 50',
      'M22 50 C 22 66, 34 78, 50 78',
      'M50 40 C 56 40, 60 44, 60 50 C 60 56, 56 60, 50 60 C 44 60, 40 56, 40 50 C 40 44, 44 40, 50 40 Z',
      'M49 50 L 51 50',
    ],
  },
  mirror: {
    viewBox: '0 0 100 100',
    strokes: [
      'M28 92 L 28 38 C 28 20, 38 9, 50 9 C 62 9, 72 20, 72 38 L 72 92 Z',
      'M36 88 L 36 40 C 36 26, 42 17, 50 17 C 58 17, 64 26, 64 40 L 64 88',
      'M44 32 L 56 22',
      'M44 44 L 58 32',
      'M22 92 L 78 92',
    ],
  },
  star: {
    viewBox: '0 0 100 100',
    strokes: ['M50 8 C 52 34, 58 44, 92 50 C 58 56, 52 66, 50 92 C 48 66, 42 56, 8 50 C 42 44, 48 34, 50 8 Z'],
  },
}

export type ScribbleKind = keyof typeof scribbles

interface StrokesProps {
  viewBox: string
  strokes: readonly string[]
  className: string
  /** Milliseconds before the first stroke starts drawing. */
  delay?: number
  flip?: boolean
  /** Fill the box instead of keeping the drawing's proportions, e.g. a ring around a phrase. */
  stretch?: boolean
  style?: CSSProperties
}

function Strokes({ viewBox, strokes, className, delay = 0, flip = false, stretch = false, style }: StrokesProps) {
  const [ref, drawn] = useInView<SVGSVGElement>({ once: true, threshold: 0.35 })
  const filter = `${useId().replace(/:/g, '')}-marker`
  return (
    <svg
      ref={ref}
      viewBox={viewBox}
      preserveAspectRatio={stretch ? 'none' : undefined}
      className={className}
      data-drawn={drawn || undefined}
      data-flip={flip || undefined}
      aria-hidden
      style={style}
    >
      <defs>
        <filter id={filter} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="3" />
          <feDisplacementMap in="SourceGraphic" scale="3.2" />
        </filter>
      </defs>
      <g filter={`url(#${filter})`}>
        {strokes.map((d, i) => (
          <path key={d} d={d} pathLength={1} style={{ transitionDelay: `${delay + i * 280}ms` }} />
        ))}
      </g>
    </svg>
  )
}

interface ScribbleProps {
  kind: ScribbleKind
  className?: string
  delay?: number
  /** Mirror horizontally, e.g. an arrow pointing left. */
  flip?: boolean
  stretch?: boolean
  style?: CSSProperties
}

export function Scribble({ kind, className, delay, flip, stretch, style }: ScribbleProps) {
  const { viewBox, strokes } = scribbles[kind]
  return (
    <Strokes
      viewBox={viewBox}
      strokes={strokes}
      className={['scribble', `scribble--${kind}`, stretch && 'scribble--stretch', className].filter(Boolean).join(' ')}
      delay={delay}
      flip={flip}
      stretch={stretch}
      style={style}
    />
  )
}

export function Motif({ name, className, delay }: { name: MotifName; className?: string; delay?: number }) {
  const { viewBox, strokes } = motifs[name]
  return (
    <Strokes
      viewBox={viewBox}
      strokes={strokes}
      className={['scribble', 'motif', className].filter(Boolean).join(' ')}
      delay={delay}
    />
  )
}

interface NoteProps {
  children: ReactNode
  arrow?: ScribbleKind
  flip?: boolean
  className?: string
  delay?: number
}

/** A handwritten aside with its arrow, placed next to whatever it points at. */
export function Note({ children, arrow = 'arrow', flip, className, delay = 0 }: NoteProps) {
  return (
    <span className={['note', className].filter(Boolean).join(' ')} aria-hidden>
      <span className="note-text">{children}</span>
      <Scribble kind={arrow} flip={flip} delay={delay + 150} className="note-arrow" />
    </span>
  )
}
