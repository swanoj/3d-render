import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { casaSound } from '../lib/casaSound'
import { gsap } from '../lib/gsap'
import { useRadio, useReducedMotion, useWebGLSupport } from '../lib/hooks'
import { club, useClubInside, useClubPhase } from './club'
import type { ClubScene } from './scene'

const TITLE = 'Club Casa · You’re in'
const count = new Intl.NumberFormat('en-AU')

const doorway = () => document.querySelector('.club-door-way')?.getBoundingClientRect() ?? null

/** The mirror ball, lowered from the ceiling once you're in. Its tiles slide round as it turns. */
function MirrorBall({ still }: { still: boolean }) {
  return (
    <div className="club-ball" aria-hidden>
      <svg viewBox="0 0 60 60">
        <defs>
          <clipPath id="club-ball-clip">
            <circle cx="30" cy="30" r="27" />
          </clipPath>
          <pattern id="club-ball-tiles" width="7" height="7" patternUnits="userSpaceOnUse">
            <rect width="6.2" height="6.2" fill="var(--stone)" />
            <rect x="3.4" y="3.4" width="2.8" height="2.8" fill="var(--cream)" />
            {!still && (
              <animateTransform attributeName="patternTransform" type="translate" from="0 0" to="7 0" dur="0.9s" repeatCount="indefinite" />
            )}
          </pattern>
          <radialGradient id="club-ball-shade" cx="38%" cy="32%" r="72%">
            <stop offset="0" stopColor="var(--cream)" stopOpacity="0.55" />
            <stop offset="0.5" stopColor="var(--charcoal)" stopOpacity="0" />
            <stop offset="1" stopColor="var(--charcoal)" stopOpacity="0.9" />
          </radialGradient>
        </defs>
        <g clipPath="url(#club-ball-clip)">
          <rect width="60" height="60" fill="var(--charcoal)" />
          <rect width="60" height="60" fill="url(#club-ball-tiles)" />
          <circle cx="30" cy="30" r="27" fill="url(#club-ball-shade)" />
        </g>
        <circle cx="30" cy="30" r="27" fill="none" stroke="var(--charcoal)" strokeWidth="1.5" />
        <path className="club-ball-glint" d="M19 17 l1.6 4.4 4.4 1.6 -4.4 1.6 -1.6 4.4 -1.6 -4.4 -4.4 -1.6 4.4 -1.6z" fill="var(--cream)" />
      </svg>
    </div>
  )
}

/** Inside the club: how many are in, the music, a drop, sharing the club, and the way out. */
function ClubBar({ onDrop, still }: { onDrop: () => void; still: boolean }) {
  const inside = useClubInside()
  const radio = useRadio()
  const [copied, setCopied] = useState(false)

  const share = async () => {
    const url = `${window.location.origin}/#club`
    const data = { title: 'Club Casa', text: 'Hold the door. This website turns into a club.', url }
    if (navigator.share) {
      try {
        await navigator.share(data)
      } catch {
        // Closed without sharing.
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2200)
    } catch {
      window.prompt('Copy the link to the club:', url)
    }
  }

  return (
    <div className="club-bar" role="group" aria-label="Club Casa">
      <p className="club-bar-count">
        <span className="club-bar-dot" aria-hidden />
        <span>{count.format(inside)} inside</span>
      </p>
      <button type="button" className="club-chip" aria-pressed={radio.on} onClick={casaSound.toggleRadio}>
        {radio.on ? 'Music on' : 'Music'}
      </button>
      {!still && (
        <button type="button" className="club-chip" onClick={onDrop}>
          Drop it
        </button>
      )}
      <button type="button" className="club-chip" onClick={share}>
        {copied ? 'Link copied' : 'Share'}
      </button>
      <button type="button" className="club-chip club-chip--solid" onClick={() => club.leave()}>
        Lights on
      </button>
    </div>
  )
}

/**
 * The club itself, over and under the page: the canvases, the mirror ball and the club bar, portalled to the end of
 * <body> so they stack between the wordmark wall, the page and the header. The scene's code loads when the door
 * first shows, and the scene is built when the door starts to open.
 */
export function ClubLayer() {
  const phase = useClubPhase()
  const webgl = useWebGLSupport()
  const reducedMotion = useReducedMotion()
  const roomCanvas = useRef<HTMLCanvasElement>(null)
  const frontCanvas = useRef<HTMLCanvasElement>(null)
  const scene = useRef<ClubScene | null>(null)
  const [mounted, setMounted] = useState(false)

  // The canvases go up as the door starts to open, and stay until the club's closed (state adjusted in render).
  const busy = phase === 'holding' || phase === 'open' || phase === 'leaving'
  if (busy && !mounted) setMounted(true)
  if (phase === 'closed' && mounted) setMounted(false)

  const showing = phase !== 'closed'
  useEffect(() => {
    if (showing && webgl) void import('./scene')
  }, [showing, webgl])

  useEffect(() => {
    const room = roomCanvas.current
    const front = frontCanvas.current
    if (!mounted || !room || !front) return
    let cancelled = false
    let built: ClubScene | null = null
    // A big drop rattles the page, like bass through a house.
    const shake = (big: boolean) => {
      if (!big || reducedMotion) return
      gsap.fromTo('.home', { y: 0 }, { y: 3, duration: 0.05, repeat: 5, yoyo: true, ease: 'none', clearProps: 'transform' })
    }
    import('./scene')
      .then(({ createScene }) => createScene(room, front, { door: doorway, reducedMotion, onDrop: shake }))
      .then((created) => {
        if (cancelled) return created.dispose()
        built = created
        scene.current = created
        document.documentElement.style.setProperty('--club-floor', `${created.floor()}px`)
      })
      .catch((error) => {
        console.warn('The club couldn’t open.', error)
        club.closed()
      })
    return () => {
      cancelled = true
      built?.dispose()
      scene.current = null
    }
  }, [mounted, reducedMotion])

  // Lights on: everyone heads home, then the door shuts. A shared link's #club goes too, so a reload stays out.
  useEffect(() => {
    if (phase !== 'leaving') return
    if (window.location.hash === '#club') window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
    const current = scene.current
    if (!current) {
      club.closed()
      return
    }
    let stale = false
    void current.leave().then(() => {
      if (!stale) club.closed()
    })
    return () => {
      stale = true
    }
  }, [phase])

  // The page joins in: club mode on <html> (the CSS turns the page's own lights down), and the tab's title.
  useEffect(() => {
    const root = document.documentElement
    if (phase === 'door' || phase === 'holding') root.dataset.club = 'door'
    else if (phase === 'open') root.dataset.club = 'on'
    else delete root.dataset.club
    if (phase !== 'open') return
    const title = document.title
    document.title = TITLE
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') club.leave()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (document.title === TITLE) document.title = title
    }
  }, [phase])

  // Leaving the home page closes the club.
  useEffect(
    () => () => {
      delete document.documentElement.dataset.club
      club.closed()
    },
    [],
  )

  if (!mounted) return null
  return createPortal(
    <>
      {webgl && <canvas ref={roomCanvas} className="club-canvas club-canvas--room" aria-hidden />}
      <MirrorBall still={reducedMotion} />
      {webgl && <canvas ref={frontCanvas} className="club-canvas club-canvas--front" aria-hidden />}
      {phase === 'open' && <ClubBar onDrop={() => scene.current?.drop()} still={reducedMotion} />}
    </>,
    document.body,
  )
}
