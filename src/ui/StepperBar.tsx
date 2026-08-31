import { type ReactNode } from 'react'
import { ActionBar } from './ActionBar'
import { Icon } from './Icon'

interface StepperBarProps {
  /** Primary action (e.g. Concluir), or a static state on a completed session.
   *  Omitted on the catalog detail, which has no session to conclude. */
  action?: ReactNode
  /** Progress through the session, drawn under the controls that move through
   *  it. Omitted where there is no session to be partway through. */
  progress?: ReactNode
  onPrev?: () => void
  onNext?: () => void
  prevDisabled?: boolean
  nextDisabled?: boolean
}

/**
 * The exercise stepper's `< action >` row, in the floating `ActionBar`. Thin
 * wrapper: ActionBar owns the fixed shell and the measured height; this just
 * lays out the stepper's controls inside it.
 *
 * CHANGED: one line, not two. It stacked because "Voltar", "Concluído" and
 * "Avançar" would not fit side by side; with the arrows reduced to their
 * chevrons they do, and the app's most-scrolled screen gets a line of fixed
 * chrome back. The arrows keep the accessible names they had — the change is
 * pixels, not semantics.
 *
 * Chrome, not tab content: it renders as a sibling of the tab panels so it
 * survives tab switches — a bar that vanished when you opened Notas
 * wouldn't read as fixed, it would read as a bug.
 */
export function StepperBar({
  action,
  progress,
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
      {/* `nav-only` is the catalog detail, which passes no action: there the two
          arrows split the line between them instead of hugging an empty middle. */}
      <div className={`entry-nav-row${action ? '' : ' nav-only'}`}>
        {hasNav && (
          <button
            className="btn subtle step-arrow"
            aria-label="Exercício anterior"
            disabled={prevDisabled}
            onClick={onPrev}
          >
            <Icon name="chevron-left" />
          </button>
        )}
        {action}
        {hasNav && (
          <button
            className="btn subtle step-arrow"
            aria-label="Próximo exercício"
            disabled={nextDisabled}
            onClick={onNext}
          >
            <Icon name="chevron-right" />
          </button>
        )}
      </div>
      {/* Under the row, not over it: the controls are what the thumb comes back
          for, so they keep the edge nearest it and the progress reads as the
          caption on what they just did. ActionBar measures its own height, so
          the screen's reservation grows to fit this on its own. */}
      {progress}
    </ActionBar>
  )
}
