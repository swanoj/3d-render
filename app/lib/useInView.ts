import { useEffect, useRef, useState } from 'react'

interface InViewOptions {
  /** Stop watching after the first time the element appears. */
  once?: boolean
  threshold?: number
  /** Grow or shrink the viewport box, e.g. "300px" to trigger before the element arrives. */
  rootMargin?: string
}

/** Whether an element is on screen, via IntersectionObserver. False on the server and until first observed. */
export function useInView<T extends Element>({ once = false, threshold = 0, rootMargin }: InViewOptions = {}) {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          if (once) observer.disconnect()
        } else if (!once) {
          setInView(false)
        }
      },
      { threshold, rootMargin },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [once, threshold, rootMargin])

  return [ref, inView] as const
}
