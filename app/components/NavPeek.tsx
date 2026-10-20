import { useRef } from 'react'
import { gsap, prefersReducedMotion, useGSAP } from '../lib/gsap'
import { PlanArt, type PlanKind } from './PlanArt'

const CAPTIONS: Record<PlanKind, string> = {
  tickets: 'Admit one · every Saturday',
  birthdays: 'Your birthday, our room',
  booths: 'A booth for the night',
}

/**
 * The card that drops down under Tickets, Birthdays or Booths in the header while the pointer (or keyboard focus)
 * is on the link: a hanging sign with that page's little show playing in it.
 */
export function NavPeek({ kind, active }: { kind: PlanKind; active: boolean }) {
  const card = useRef<HTMLDivElement>(null)
  const swing = useRef<gsap.core.Timeline | null>(null)

  useGSAP(
    () => {
      gsap.set(card.current, { autoAlpha: 0, y: -14, rotation: -4, scale: 0.92, transformOrigin: '50% 0%' })
      swing.current = gsap
        .timeline({ paused: true })
        .to(card.current, { autoAlpha: 1, y: 0, scale: 1, duration: 0.3, ease: 'power3.out' }, 0)
        .to(card.current, { rotation: 0, duration: 0.9, ease: 'elastic.out(1, 0.35)' }, 0)
    },
    { scope: card },
  )

  useGSAP(
    () => {
      const tl = swing.current
      if (!tl) return
      if (prefersReducedMotion()) tl.progress(active ? 1 : 0)
      else if (active) tl.timeScale(1).play()
      else tl.timeScale(2.4).reverse()
    },
    { dependencies: [active] },
  )

  return (
    <div ref={card} className="nav-peek" aria-hidden>
      <span className="nav-peek-string" />
      <PlanArt kind={kind} active={active} />
      <span className="nav-peek-caption mono">{CAPTIONS[kind]}</span>
    </div>
  )
}
