import { useRef, type ReactNode } from 'react'
import { gsap, prefersReducedMotion, ScrollTrigger, SplitText, useGSAP } from '../lib/gsap'
import { belowFold } from '../lib/scrollFx'

interface StampedTitleProps {
  children: string
  as?: 'h1' | 'h2'
  id?: string
  className?: string
  /** Drawn after the letters, e.g. a marker underline. */
  extra?: ReactNode
}

/** A hand-lettered heading whose letters stamp down one at a time as it scrolls into view, like rubber stamps. */
export function StampedTitle({ children, as: Tag = 'h2', id, className, extra }: StampedTitleProps) {
  const heading = useRef<HTMLHeadingElement>(null)
  const letters = useRef<HTMLSpanElement>(null)

  useGSAP(
    () => {
      const target = letters.current
      if (!target || prefersReducedMotion() || !belowFold(target)) return
      const split = SplitText.create(target, { type: 'chars,words', charsClass: 'stamp-char' })
      gsap.set(split.chars, { yPercent: -150, autoAlpha: 0, rotation: () => gsap.utils.random(-18, 18) })
      ScrollTrigger.create({
        trigger: target,
        start: 'top 86%',
        once: true,
        onEnter: () =>
          gsap.to(split.chars, {
            yPercent: 0,
            autoAlpha: 1,
            rotation: () => gsap.utils.random(-3, 3),
            duration: 0.5,
            ease: 'back.out(2.6)',
            stagger: 0.035,
          }),
      })
      return () => split.revert()
    },
    { scope: heading },
  )

  return (
    <Tag ref={heading} id={id} className={className}>
      <span ref={letters} className="stamped">
        {children}
      </span>
      {extra}
    </Tag>
  )
}
