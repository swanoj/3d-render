import { createContext, useContext } from 'react'
import { useMatches } from 'react-router'
import { brand, isMoodId, moods, type MoodId } from '../brand/brand'

/*
 * Colourways. Each route declares one (a night's page takes that night's), and a page can override it while the
 * visitor interacts. The effective colourway drives the WebGL wordmark wall and the --mood-* CSS variables, so the
 * page and the wall change together. The provider lives in MoodProvider.tsx.
 */

export interface RouteHandle {
  mood?: MoodId
}

/** The deepest matching route's colourway: from its loader data first (`{ mood }`), then from its `handle`. */
export function useRouteMood(): MoodId {
  const matches = useMatches()
  for (let i = matches.length - 1; i >= 0; i--) {
    const match = matches[i]
    const fromData = (match.loaderData as { mood?: unknown } | undefined)?.mood
    if (isMoodId(fromData)) return fromData
    const fromHandle = (match.handle as RouteHandle | undefined)?.mood
    if (isMoodId(fromHandle)) return fromHandle
  }
  return brand.defaultMood
}

const colourNames = ['base', 'ink', 'accent', 'onAccent', 'pattern', 'glow'] as const

/** The colourway's CSS custom properties, e.g. ["--mood-on-accent", "#212121"]. */
export function moodVariables(id: MoodId): [string, string][] {
  const mood = moods[id]
  return [
    ...colourNames.map((name): [string, string] => [
      `--mood-${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`,
      mood[name],
    ]),
    ['--mood-pattern-opacity', String(mood.patternOpacity)],
    ['--mood-glow-strength', String(mood.glowStrength)],
  ]
}

/** The colourway as a :root rule, rendered into <head> so the first paint already has the right colours. */
export function moodCss(id: MoodId) {
  return `:root{${moodVariables(id)
    .map(([name, value]) => `${name}:${value}`)
    .join(';')}}`
}

export interface MoodContextValue {
  mood: MoodId
  setOverride: (mood: MoodId | null) => void
}

export const MoodContext = createContext<MoodContextValue>({
  mood: brand.defaultMood,
  setOverride: () => {},
})

export function useMood() {
  return useContext(MoodContext)
}
