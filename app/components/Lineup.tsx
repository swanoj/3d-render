import type { CSSProperties } from 'react'

// Indents (in em) that reproduce the loose, hand-set stagger of the poster line-ups.
const INDENTS = [0, 2.6, 0.5, 3.5, 1.3, 0, 2.1, 0, 2.8, 5.4, 0.7, 1.8, 0.2, 3.1]

/** A line-up set like the posters: one artist per line, each nudged a different distance from the margin. */
export function Lineup({ names, align = 'start' }: { names: string[]; align?: 'start' | 'center' }) {
  return (
    <ul className={`lineup lineup--${align}`}>
      {names.map((name, i) => (
        <li key={name} style={{ '--indent': `${INDENTS[i % INDENTS.length]}em` } as CSSProperties}>
          {name}
        </li>
      ))}
    </ul>
  )
}
