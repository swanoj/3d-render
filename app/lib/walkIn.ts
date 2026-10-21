import { useEffect, useState, type RefObject } from 'react'
import { club } from '../club/club'
import { casaSound } from './casaSound'
import { gsap, ScrollTrigger } from './gsap'
import { useReducedMotion } from './hooks'
import { useCopy } from './useSite'
import { walk } from './walk'

/*
 * The walk in, on the v2 home page: the page is the way into the club. At the top you're out on the street and the
 * music comes through the walls, just the kick and the bass. Scrolling down is walking in: past the door, inside, the
 * bar, the floor, where it's all there, and back out past the venue's address, where the walls close in again. The
 * lamps, the logo and the type swell with the beat, more the closer you are. Each section says where it is with
 * `data-walk`; the sound is Casa Radio's, so the header's control and the dock work as everywhere else.
 */

export type Stage = 'street' | 'door' | 'inside' | 'bar' | 'floor' | 'out'

/** How close to the floor each place is, 0–1, and what it's called (the street's name comes from the venue). */
const STAGES: Record<Stage, { closeness: number; name: string }> = {
  street: { closeness: 0, name: '' },
  door: { closeness: 0.45, name: 'At the door' },
  inside: { closeness: 0.85, name: 'Inside' },
  bar: { closeness: 0.92, name: 'At the bar' },
  floor: { closeness: 1, name: 'On the floor' },
  out: { closeness: 0.15, name: 'Back outside' },
}

interface Place {
  stage: Stage
  top: number
  bottom: number
}

function isStage(value: string | undefined): value is Stage {
  return value !== undefined && value in STAGES
}

const smooth = (t: number) => {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

/**
 * How close to the floor the middle of the screen is: a place's own closeness while you're in it, eased into the
 * next across the boundary between them, over `band` pixels either side.
 */
function closenessAt(eye: number, places: Place[], band: number) {
  for (let k = 0; k < places.length; k++) {
    const place = places[k]
    if (eye >= place.bottom && k < places.length - 1) continue
    const value = STAGES[place.stage].closeness
    const previous = places[k - 1]
    if (previous && eye < place.top + band) {
      return STAGES[previous.stage].closeness + (value - STAGES[previous.stage].closeness) * smooth((eye - place.top + band) / (2 * band))
    }
    const next = places[k + 1]
    if (next && eye > place.bottom - band) {
      return value + (STAGES[next.stage].closeness - value) * smooth((eye - place.bottom + band) / (2 * band))
    }
    return value
  }
  return 0
}

function stageAt(eye: number, places: Place[]): Stage {
  return (places.find((place) => eye < place.bottom) ?? places[places.length - 1])?.stage ?? 'street'
}

/** What a place is called: "Fitzroy Street" (from the venue's address), "At the door", "Inside"… */
export function useStageName() {
  const { venue } = useCopy()
  const street = venue.street.replace(/^[\d\s/-]+/, '') || venue.street
  return (stage: Stage) => (stage === 'street' ? street : STAGES[stage].name)
}

/**
 * Walks the visitor in as they scroll the page under `page`: sets how muffled the music is, the beat for the lamps
 * (`--beat`, and `--near` for how close they are, on the page) and returns where they are.
 */
export function useWalkIn(page: RefObject<HTMLElement | null>) {
  const [stage, setStage] = useState<Stage>('street')
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const root = page.current
    if (!root) return
    let places: Place[] = []
    const measure = () => {
      places = [...root.querySelectorAll<HTMLElement>('[data-walk]')].flatMap((element) => {
        const name = element.dataset.walk
        if (!isStage(name)) return []
        const rect = element.getBoundingClientRect()
        return [{ stage: name, top: rect.top + window.scrollY, bottom: rect.bottom + window.scrollY }]
      })
    }
    measure()
    ScrollTrigger.addEventListener('refresh', measure)
    window.addEventListener('resize', measure)
    walk.active = true
    document.documentElement.dataset.walk = ''

    let here: Stage = 'street'
    let beat = 0
    let shownBeat = -1
    let shownNear = -1
    let last = performance.now()
    const tick = () => {
      const now = performance.now()
      const seconds = Math.min(0.1, (now - last) / 1000)
      last = now
      const eye = window.scrollY + window.innerHeight / 2
      let closeness = closenessAt(eye, places, window.innerHeight * 0.3)
      // Holding the club's door lets the sound through; inside the club it's all there.
      if (club.phase === 'open') closeness = 1
      else if (club.phase === 'holding') closeness = Math.max(closeness, club.progress)
      casaSound.setStreet(closeness)

      // The beat swells fast and ebbs slowly, so the lamps breathe rather than flash, and it's fainter outside.
      const pulse = reducedMotion ? 0 : casaSound.pulse()
      beat = pulse > beat ? beat + (pulse - beat) * Math.min(1, seconds * 30) : beat * Math.exp(-seconds / 0.24)
      const felt = beat * (0.35 + 0.65 * closeness)
      walk.beat = felt
      walk.closeness = closeness
      const roundedBeat = Math.round(felt * 100) / 100
      if (roundedBeat !== shownBeat) {
        shownBeat = roundedBeat
        root.style.setProperty('--beat', String(roundedBeat))
      }
      const near = Math.round(closeness * 100) / 100
      if (near !== shownNear) {
        shownNear = near
        root.style.setProperty('--near', String(near))
      }
      const stageNow = stageAt(eye, places)
      if (stageNow !== here) {
        here = stageNow
        setStage(stageNow)
      }
    }
    // One clock for everything that moves: GSAP's, which the scroll effects already run on.
    gsap.ticker.add(tick)

    return () => {
      gsap.ticker.remove(tick)
      ScrollTrigger.removeEventListener('refresh', measure)
      window.removeEventListener('resize', measure)
      walk.active = false
      walk.beat = 0
      walk.closeness = 1
      casaSound.setStreet(null)
      delete document.documentElement.dataset.walk
    }
  }, [page, reducedMotion])

  return stage
}
