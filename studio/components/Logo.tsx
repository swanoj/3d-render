/** Casa, in orange, as the back office's icon (the official mark, from static/mascot.png). */
export function Logo() {
  const mask = 'url(/static/mascot.png) center / contain no-repeat'
  return (
    <span
      aria-hidden
      style={{ display: 'block', width: '100%', height: '100%', background: '#E95E27', mask, WebkitMask: mask }}
    />
  )
}
