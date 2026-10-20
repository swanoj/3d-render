import { useSyncExternalStore } from 'react'

/*
 * Club Casa after dark, the home page's easter egg. In the bottom-left of the hero there's a door with light leaking
 * under it, thumping. Move the pointer down there and it shows itself, with Casa on the door; hold the pointer on
 * it (press and hold on a touch screen, or hold Space) and it swings open, Casa's mates pour out and the page turns
 * into the club. A link to /#club opens the door for whoever you send it to.
 *
 * This is the shared state. Components re-render when the phase (or the count inside) changes; the door's swing
 * and the WebGL scene follow `progress` every frame through `onTick`.
 */

export type ClubPhase =
  /** Just the light under the door. */
  | 'closed'
  /** The door's showing, shut. */
  | 'door'
  /** It's opening: held, or swinging shut again after being let go. */
  | 'holding'
  /** You're in. */
  | 'open'
  /** Lights on: everyone's heading home. */
  | 'leaving'

/** Seconds of holding it takes to get in, and for the door to swing shut again when let go. */
const HOLD = 1.8
const LET_GO = 0.9
/** Milliseconds the door has to have been showing before holding it does anything, so passing by doesn't. */
const SETTLE = 350

class Club {
  phase: ClubPhase = 'closed'
  /** How far the door is open, 0–1: it rises while held and falls back when let go. At 1 you're in. */
  progress = 0
  /** How many are inside, for the club bar. */
  inside = 0
  private holding = false
  private invited = false
  private revealedAt = 0
  private listeners = new Set<() => void>()
  private tickers = new Set<(seconds: number) => void>()
  private frame = 0
  private last = 0

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** Calls `tick` with the seconds since the last frame, every frame until the returned function is called. */
  onTick(tick: (seconds: number) => void) {
    this.tickers.add(tick)
    this.wake()
    return () => {
      this.tickers.delete(tick)
    }
  }

  /** The pointer (or the keyboard) found the door. */
  reveal() {
    if (this.phase === 'closed') this.set('door')
  }

  /** The pointer wandered off without going in. */
  conceal() {
    if (this.phase === 'door' && !this.holding && !this.invited) this.set('closed')
  }

  /** Holding the door, or letting go of it. */
  hold(on: boolean) {
    this.holding = on
    if (on) this.reveal()
    this.wake()
  }

  /** Opens up with nobody holding the door: for a shared link. */
  invite() {
    this.invited = true
    this.reveal()
    this.wake()
  }

  /** Lights on. The scene plays everyone out, then calls `closed`. */
  leave() {
    if (this.phase === 'open') this.set('leaving')
  }

  closed() {
    this.progress = 0
    this.holding = false
    this.invited = false
    this.inside = 0
    this.set('closed')
  }

  setInside(count: number) {
    if (count === this.inside) return
    this.inside = count
    this.notify()
  }

  private set(phase: ClubPhase) {
    if (phase === this.phase) return
    if (this.phase === 'closed') this.revealedAt = performance.now()
    this.phase = phase
    this.notify()
    this.wake()
  }

  private notify() {
    for (const listener of this.listeners) listener()
  }

  private wake() {
    if (this.frame || typeof window === 'undefined') return
    this.last = performance.now()
    this.frame = requestAnimationFrame(this.tick)
  }

  private tick = (now: number) => {
    const seconds = Math.min(0.05, Math.max(0, (now - this.last) / 1000))
    this.last = now
    if (this.phase === 'door' || this.phase === 'holding') {
      const pushing = (this.holding || this.invited) && now - this.revealedAt > SETTLE
      this.progress = Math.min(1, Math.max(0, this.progress + (pushing ? seconds / HOLD : -seconds / LET_GO)))
      this.set(this.progress >= 1 ? 'open' : this.progress > 0 ? 'holding' : 'door')
    }
    for (const tick of this.tickers) tick(seconds)
    const busy = this.tickers.size > 0 || this.phase === 'holding' || this.holding || this.invited
    this.frame = busy ? requestAnimationFrame(this.tick) : 0
  }
}

export const club = new Club()

const getPhase = () => club.phase
const getInside = () => club.inside

export function useClubPhase() {
  return useSyncExternalStore(club.subscribe, getPhase, () => 'closed' as ClubPhase)
}

export function useClubInside() {
  return useSyncExternalStore(club.subscribe, getInside, () => 0)
}
