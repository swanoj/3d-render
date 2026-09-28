import type { CSSProperties } from 'react'

/*
 * Brand marks traced from the Alicyte Design asset set (public/brand/*.svg). Each renders as a CSS mask filled
 * with currentColor, so one file serves every colourway. Replace the SVGs with the designer's master files and
 * nothing else has to change.
 */
const marks = {
  logo: [1600, 240],
  'logo-stacked': [860, 510],
  'logo-circled': [1660, 545],
  submark: [676, 572],
  circle: [624, 660],
  oval: [660, 222],
  underline: [678, 216],
  'double-line': [672, 210],
  check: [560, 440],
  cross: [623, 707],
  squiggle: [840, 116],
} as const

export type MarkName = keyof typeof marks

interface MarkProps {
  name: MarkName
  /** Accessible name. Without one the mark is decorative and hidden from assistive technology. */
  label?: string
  className?: string
  style?: CSSProperties
}

export function Mark({ name, label, className, style }: MarkProps) {
  const [width, height] = marks[name]
  const url = `url(/brand/${name}.svg)`
  return (
    <span
      className={['mark', className].filter(Boolean).join(' ')}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ aspectRatio: `${width} / ${height}`, WebkitMaskImage: url, maskImage: url, ...style }}
    />
  )
}
