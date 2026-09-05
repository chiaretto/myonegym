import { type ReactNode, useEffect } from 'react'
import { Icon } from './Icon'

interface SheetProps {
  title: string
  onClose: () => void
  children: ReactNode
  /** A control on the title's own line, between it and the close button — for
   *  something that changes what the sheet is showing rather than acting on it.
   *  Kept out of the body so it does not scroll away with the content. */
  action?: ReactNode
  /**
   * Where the panel sits.
   *
   * - `bottom` (default) — rises from the bottom edge. A drawer of actions,
   *   and the reach a thumb has without moving the hand.
   * - `centre` — floats in the middle. For short, decision-shaped modals, where
   *   a bottom sheet reads as a list of options rather than as a question.
   * - `top` — hangs from the top edge. For a panel the user is **typing into**:
   *   the on-screen keyboard takes the bottom half of the screen, and a sheet
   *   that starts down there ends up half under it.
   */
  placement?: 'bottom' | 'centre' | 'top'
}

/**
 * The sheets currently mounted, innermost last.
 *
 * Escape must close **one** sheet — the one on top. Without this every mounted
 * sheet listens on the window and answers the same keystroke, so opening the
 * weight history from inside the weight editor and pressing Escape would shut
 * both, throwing away a half-typed weight to dismiss a list.
 */
const stack: symbol[] = []

/** Modal sheet (see `placement`). Closes on backdrop click or Escape. */
export function Sheet({ title, onClose, children, action, placement = 'bottom' }: SheetProps) {
  useEffect(() => {
    const id = Symbol('sheet')
    stack.push(id)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && stack[stack.length - 1] === id) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      stack.splice(stack.indexOf(id), 1)
    }
  }, [onClose])

  return (
    <div
      className={`sheet-backdrop${placement === 'bottom' ? '' : ` ${placement}`}`}
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
          {action}
          <button className="icon-btn ghost sheet-close" aria-label="Fechar" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
