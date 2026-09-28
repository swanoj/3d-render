import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router'
import { moods, type MoodId } from '../brand/brand'
import { MoodContext, moodVariables } from './mood'

export function MoodProvider({ routeMood, children }: { routeMood: MoodId; children: ReactNode }) {
  const { pathname } = useLocation()
  // An override belongs to the page that set it, so navigating away drops it without an extra render.
  const [override, setOverrideState] = useState<{ pathname: string; mood: MoodId } | null>(null)
  const mood = override?.pathname === pathname ? override.mood : routeMood

  const setOverride = useCallback(
    (next: MoodId | null) => setOverrideState(next ? { pathname, mood: next } : null),
    [pathname],
  )

  // Inline variables on <html> win over the server-rendered :root rule and animate through @property.
  useEffect(() => {
    const style = document.documentElement.style
    for (const [name, value] of moodVariables(mood)) style.setProperty(name, value)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', moods[mood].base)
  }, [mood])

  const value = useMemo(() => ({ mood, setOverride }), [mood, setOverride])
  return <MoodContext.Provider value={value}>{children}</MoodContext.Provider>
}
