import { type ReactNode, useEffect } from 'react'
import { Icon } from './Icon'

interface SheetProps {
  title: string
  onClose: () => void
  children: ReactNode
  /** Float the panel in the middle of the screen instead of rising from the
   *  bottom edge. For short modals that ask something rather than offering a
   *  drawer of actions. */
  centred?: boolean
}

/** Bottom sheet modal (see `centred`). Closes on backdrop click or Escape. */
export function Sheet({ title, onClose, children, centred = false }: SheetProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className={`sheet-backdrop${centred ? ' centred' : ''}`}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn ghost sheet-close" aria-label="Fechar" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
