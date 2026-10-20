import type { ReactNode } from 'react'
import { Mark, type MarkName } from './Mark'

interface PageHeroProps {
  label: string
  title: string
  intro?: ReactNode
  /** A brand mark set large beside the title. */
  mark?: MarkName
  children?: ReactNode
}

/** The top of every inner page: a small label, the page name in the hand face, a line of intro. */
export function PageHero({ label, title, intro, mark, children }: PageHeroProps) {
  return (
    <header className="page-header" data-mark={mark || undefined}>
      <div className="page-header-text">
        <p className="label">{label}</p>
        <h1 className="hand page-title">{title}</h1>
        {intro && <p className="mono page-intro">{intro}</p>}
        {children}
      </div>
      {mark && <Mark name={mark} className={`page-header-mark page-header-mark--${mark}`} />}
    </header>
  )
}
