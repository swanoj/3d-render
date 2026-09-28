import { useRef, useState } from 'react'

/**
 * Shares the current page with the system share sheet, or copies the link where there isn't one. Only the origin
 * and path are shared, so preview tokens and tracking parameters in the address bar never travel with it.
 */
export function ShareButton({ title, text }: { title: string; text: string }) {
  const [status, setStatus] = useState('')
  const timer = useRef(0)

  const flash = (message: string) => {
    setStatus(message)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setStatus(''), 2600)
  }

  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}`
    // Desktop Firefox and older browsers have no share sheet.
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text, url })
      } catch {
        // Closing the share sheet rejects; nothing to report.
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      flash('Link copied')
    } catch {
      flash(`Copy this link: ${url}`)
    }
  }

  return (
    <>
      <button type="button" className="button" onClick={share}>
        Share
      </button>
      <span className="share-status mono" role="status">
        {status}
      </span>
    </>
  )
}
