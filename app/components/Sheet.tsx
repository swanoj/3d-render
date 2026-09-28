import { useEffect, useRef, type ReactNode } from 'react'

interface SheetProps {
  open: boolean
  onClose: () => void
  /** id of the element that names the sheet, usually its heading. */
  labelledBy: string
  side?: 'right' | 'full'
  id?: string
  children: ReactNode
}

/**
 * A modal panel built on the native <dialog>: the browser traps focus, closes it on Escape and restores focus
 * afterwards. Clicking the backdrop closes it too.
 */
export function Sheet({ open, onClose, labelledBy, side = 'right', id, children }: SheetProps) {
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (open && !element.open) element.showModal()
    if (!open && element.open) element.close()
  }, [open])

  return (
    <dialog
      ref={dialog}
      id={id}
      className={`sheet sheet--${side}`}
      aria-labelledby={labelledBy}
      onClose={onClose}
      // The panel fills the dialog, so a click that lands on the dialog itself landed on the backdrop.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="sheet-panel">{children}</div>
    </dialog>
  )
}
