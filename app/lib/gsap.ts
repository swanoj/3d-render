import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'

/*
 * GSAP, with ScrollTrigger and SplitText, registered once in the browser. Pages import from here rather than from
 * 'gsap' so the plugins are always registered before use. On the server nothing animates.
 */
if (typeof window !== 'undefined') {
  gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText)
}

/** True when the visitor has asked for less motion: everything shows in its final state instead. */
export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** True on touch screens, where there's no hover: hover pieces play as they scroll into view instead. */
export function cannotHover() {
  return typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches
}

/** A repeatable pseudo-random sequence, so confetti and the like come out the same every time. */
export function seeded(seed: number) {
  let value = seed
  return () => {
    value = (value * 16807) % 2147483647
    return (value - 1) / 2147483646
  }
}

export { gsap, ScrollTrigger, SplitText, useGSAP }
