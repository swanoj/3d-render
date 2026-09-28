import { useNow } from '../lib/hooks'
import { pad2 } from '../lib/format'

interface CountdownProps {
  /** Target time, ms since epoch. */
  to: number
  /** The server's time when it rendered, so the first client render matches the HTML. */
  now: number
}

/** "02d 14h 05m 33s" until `to`, ticking every second. */
export function Countdown({ to, now: serverNow }: CountdownProps) {
  const now = useNow(serverNow)
  const remaining = Math.max(0, to - now)
  const seconds = Math.floor(remaining / 1000)
  const parts = [
    [Math.floor(seconds / 86400), 'd'],
    [Math.floor((seconds % 86400) / 3600), 'h'],
    [Math.floor((seconds % 3600) / 60), 'm'],
    [seconds % 60, 's'],
  ] as const

  return (
    <span className="countdown">
      {parts.map(([value, unit]) => (
        <span key={unit} className="countdown-part">
          {pad2(value)}
          <small>{unit}</small>
        </span>
      ))}
    </span>
  )
}
