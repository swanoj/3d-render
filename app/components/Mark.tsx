import type { CSSProperties } from 'react'
import { markUrl, marks, type MarkName } from '../lib/marks'

export type { MarkName }

interface MarkProps {
  name: MarkName
  /** Accessible name. Without one the mark is decorative and hidden from assistive technology. */
  label?: string
  className?: string
  style?: CSSProperties
}

export function Mark({ name, label, className, style }: MarkProps) {
  const [, width, height] = marks[name]
  const url = `url(${markUrl(name)})`
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
