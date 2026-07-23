import { type ReactNode, useEffect, useRef } from 'react'

/**
 * A bar fixed to the bottom of the screen for a screen's primary action(s) —
 * the create button on the settings screens, "Concluir treino" on the runner,
 * and (via StepperBar) the exercise stepper.
 *
 * The bar's height is **measured**, not assumed. Everything in it scales with
 * `--font-scale` (100–200%, see app-foundation), so a hard-coded reservation
 * would let the bar cover content at large scales — the exact thing this exists
 * to prevent. The measured height is published as `--action-bar-h` on <html>,
 * which `.screen.has-action-bar` and `.toast` consume.
 *
 * Renders nothing when it has no children, so a screen can mount it
 * conditionally without reserving space for an empty bar.
 */
export function ActionBar({ children }: { children?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const root = document.documentElement
    const publish = () => root.style.setProperty('--action-bar-h', `${el.offsetHeight}px`)
    publish()
    const ro = new ResizeObserver(publish)
    ro.observe(el)
    return () => {
      ro.disconnect()
      // Leave no reservation behind for screens without a bar.
      root.style.removeProperty('--action-bar-h')
    }
  }, [])

  if (children == null || children === false) return null

  return (
    <div className="action-bar" ref={ref}>
      {children}
    </div>
  )
}
