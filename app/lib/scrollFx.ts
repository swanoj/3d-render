import type { RefObject } from 'react'
import { gsap, prefersReducedMotion, ScrollTrigger, useGSAP } from './gsap'

/*
 * Scroll effects. Everything starts from what the server rendered: nothing is hidden until the browser knows it's
 * below the fold, so there's no flash of missing content, and nothing moves under "reduce motion". The stamped
 * headings are in components/ScrollFx.tsx.
 */

/** Is the element's top still below the bottom of the screen? Only those get hidden and revealed on scroll. */
export const belowFold = (element: Element) => element.getBoundingClientRect().top > window.innerHeight * 0.96

/** Cards and panels rising into place, a little crooked, as they scroll into view. */
export function useScrollReveal(scope: RefObject<HTMLElement | null>, selector: string) {
  useGSAP(
    () => {
      if (prefersReducedMotion() || !scope.current) return
      const items = gsap.utils.toArray<HTMLElement>(selector, scope.current).filter(belowFold)
      if (!items.length) return
      gsap.set(items, { y: 80, rotation: (i) => (i % 2 ? -2.5 : 2.5), autoAlpha: 0 })
      ScrollTrigger.batch(items, {
        start: 'top 92%',
        once: true,
        onEnter: (batch) =>
          gsap.to(batch, { y: 0, rotation: 0, autoAlpha: 1, duration: 0.85, ease: 'power3.out', stagger: 0.12 }),
      })
    },
    { scope },
  )
}

/** The hero drifting up and easing back as the page scrolls past it. */
export function useHeroParallax(scope: RefObject<HTMLElement | null>) {
  useGSAP(
    () => {
      if (prefersReducedMotion() || !scope.current) return
      const q = gsap.utils.selector(scope.current)
      gsap
        .timeline({ scrollTrigger: { trigger: scope.current, start: 'top top', end: 'bottom top', scrub: 0.6 } })
        .to(q('.hero-logo'), { yPercent: -22, rotation: -3, scale: 0.92, ease: 'none' }, 0)
        .to(q('.hero-tagline'), { yPercent: -60, autoAlpha: 0.15, ease: 'none' }, 0)
        .to(q('.hero-hours, .hero-actions'), { yPercent: -40, autoAlpha: 0, ease: 'none' }, 0)
        .to(q('.hero-emblem'), { y: 80, ease: 'none' }, 0)
    },
    { scope },
  )
}
