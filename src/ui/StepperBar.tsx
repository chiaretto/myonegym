import { type ReactNode } from 'react'
import { ActionBar } from './ActionBar'
import { Icon } from './Icon'

interface StepperBarProps {
  /** Primary action (e.g. Concluir), or a static state on a completed session.
   *  Omitted on the catalog detail, which has no session to conclude. */
  action?: ReactNode
  onPrev?: () => void
  onNext?: () => void
  prevDisabled?: boolean
  nextDisabled?: boolean
}

/**
 * The exercise stepper's action + Voltar/Avançar row, in the floating
 * `ActionBar`. Thin wrapper: ActionBar owns the fixed shell and the measured
 * height; this just lays out the stepper's controls inside it.
 *
 * Chrome, not tab content: it renders as a sibling of the tab panels so it
 * survives tab switches — a bar that vanished when you opened Observações
 * wouldn't read as fixed, it would read as a bug.
 */
export function StepperBar({
  action,
  onPrev,
  onNext,
  prevDisabled,
  nextDisabled,
}: StepperBarProps) {
  const hasNav = onPrev != null || onNext != null

  // Nothing to show (e.g. catalog detail opened without a day) → no bar at all.
  if (!action && !hasNav) return null

  return (
    <ActionBar>
      {action}
      {hasNav && (
        <div className="entry-nav-row">
          <button
            className="btn subtle"
            aria-label="Exercício anterior"
            disabled={prevDisabled}
            onClick={onPrev}
          >
            <Icon name="chevron-left" /> Voltar
          </button>
          <button
            className="btn subtle"
            aria-label="Próximo exercício"
            disabled={nextDisabled}
            onClick={onNext}
          >
            Avançar <Icon name="chevron-right" />
          </button>
        </div>
      )}
    </ActionBar>
  )
}
