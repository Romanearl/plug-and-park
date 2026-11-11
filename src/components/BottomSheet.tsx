import { useEffect, type ReactNode } from 'react'
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
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className={full ? 'sheet full' : 'sheet'} role="dialog" aria-modal="true" aria-labelledby={labelId}>
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
