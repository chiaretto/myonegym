import { type ReactNode, useEffect, useRef } from 'react'
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
 * The exercise stepper, fixed to the bottom of the screen.
 *
 * Chrome, not tab content: it renders as a sibling of the tab panels so it
 * survives tab switches — a bar that vanished when you opened Observações
 * wouldn't read as fixed, it would read as a bug.
 *
 * The bar's height is **measured**, not assumed. Everything in it scales with
 * `--font-scale` (100–200%, see app-foundation), so a hard-coded reservation
 * would let the bar cover content at large scales — the exact thing this
 * component exists to prevent. The measured height is published as
 * `--stepper-h` on <html>, which `.screen.has-stepper` and `.toast` consume.
 */
export function StepperBar({
  action,
  onPrev,
  onNext,
  prevDisabled,
  nextDisabled,
}: StepperBarProps) {
  const ref = useRef<HTMLDivElement>(null)
  const hasNav = onPrev != null || onNext != null

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const root = document.documentElement
    const publish = () => root.style.setProperty('--stepper-h', `${el.offsetHeight}px`)
    publish()
    const ro = new ResizeObserver(publish)
    ro.observe(el)
    return () => {
      ro.disconnect()
      // Leave no reservation behind for screens without a bar.
      root.style.removeProperty('--stepper-h')
    }
  }, [])

  // Nothing to show (e.g. catalog detail opened without a day) → no bar at all,
  // and no space reserved.
  if (!action && !hasNav) return null

  return (
    <div className="stepper-bar" ref={ref}>
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
    </div>
  )
}
