import { useEffect, useRef, type ReactNode } from 'react'
import { Icon } from './Icon'

/** Modal bottom sheet, positioned inside .screen (never fixed to the window). */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
  labelId = 'sheet-title',
  full = false,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  labelId?: string
  /** Full height (e.g. the booking sheet). */
  full?: boolean
  /** Pinned under the scrolling body (e.g. the primary CTA). */
  footer?: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  // Most screens pass a new onClose function on every render. Keep the latest one in a ref, so the
  // effect below runs only when the sheet opens or closes — otherwise every re-render of the screen
  // (e.g. the other phone saving something) pulled the focus back to the first control of the sheet.
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    if (!open) return
    const opener = document.activeElement as HTMLElement | null
    // Focus the first control inside the sheet, trap Tab inside it, close on Escape, restore focus on close.
    const focusables = () =>
      [...(ref.current?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? [])].filter((el) => !el.hasAttribute('disabled'))
    window.setTimeout(() => focusables()[0]?.focus({ preventScroll: true }), 0)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current()
      if (e.key !== 'Tab') return
      const els = focusables()
      if (!els.length) return
      const first = els[0]
      const last = els[els.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true })
    }
  }, [open])

  if (!open) return null
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className={full ? 'sheet full' : 'sheet'} role="dialog" aria-modal="true" aria-labelledby={labelId} ref={ref}>
        <div className="sheet-handle" />
        <div className="sheet-head">
          <h2 className="h2" id={labelId} style={{ flex: 1 }}>
            {title}
          </h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-footer">{footer}</div>}
      </div>
    </>
  )
}
