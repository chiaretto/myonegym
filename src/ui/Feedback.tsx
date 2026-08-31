import { createContext, type ReactNode, useCallback, useContext, useState } from 'react'
import { Sheet } from './Sheet'

/* ------------------------------------------------------------------ toast */

const ToastCtx = createContext<(msg: string) => void>(() => {})
export const useToast = () => useContext(ToastCtx)

/* ---------------------------------------------------------------- confirm */

interface ConfirmOpts {
  title: string
  message?: string
  confirmLabel?: string
  danger?: boolean
}
const ConfirmCtx = createContext<(opts: ConfirmOpts) => Promise<boolean>>(async () => false)
export const useConfirm = () => useContext(ConfirmCtx)

interface PendingConfirm extends ConfirmOpts {
  resolve: (ok: boolean) => void
}

/* ----------------------------------------------------------------- choice */

export interface ChoiceOption {
  /** What the promise resolves to when this one is picked. */
  id: string
  label: string
  /** Visual weight; the default is the plain secondary button. */
  tone?: 'primary' | 'danger'
  disabled?: boolean
  /** Why it is unavailable, read under the button. */
  hint?: string
}

interface ChoiceOpts {
  title: string
  message?: string
  options: ChoiceOption[]
}

/**
 * Asks the user to pick one of several ways forward, resolving the chosen
 * option's `id` — or **null** when they dismiss it (the X, the backdrop, or
 * Escape), which always means "do nothing".
 *
 * Distinct from `useConfirm`, which asks yes/no about a single action. Where
 * there are three ways out and two of them change data, a two-button confirm
 * has to hide one behind a second dialog, and the user cannot see what their
 * choices are before choosing one.
 */
const ChoiceCtx = createContext<(opts: ChoiceOpts) => Promise<string | null>>(async () => null)
export const useChoice = () => useContext(ChoiceCtx)

interface PendingChoice extends ChoiceOpts {
  resolve: (id: string | null) => void
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingConfirm | null>(null)
  const [choosing, setChoosing] = useState<PendingChoice | null>(null)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2600)
  }, [])

  const confirm = useCallback(
    (opts: ConfirmOpts) =>
      new Promise<boolean>((resolve) => setPending({ ...opts, resolve })),
    [],
  )

  const choice = useCallback(
    (opts: ChoiceOpts) => new Promise<string | null>((resolve) => setChoosing({ ...opts, resolve })),
    [],
  )

  const settle = (ok: boolean) => {
    pending?.resolve(ok)
    setPending(null)
  }

  const settleChoice = (id: string | null) => {
    choosing?.resolve(id)
    setChoosing(null)
  }

  return (
    <ToastCtx.Provider value={showToast}>
      <ConfirmCtx.Provider value={confirm}>
        <ChoiceCtx.Provider value={choice}>
          {children}
          {toast && <div className="toast">{toast}</div>}
          {pending && (
            <Sheet title={pending.title} onClose={() => settle(false)}>
              {pending.message && (
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                  {pending.message}
                </p>
              )}
              <div className="sheet-actions">
                <button className="btn subtle" onClick={() => settle(false)}>
                  Cancelar
                </button>
                <button
                  className={`btn ${pending.danger ? 'primary' : 'primary'}`}
                  onClick={() => settle(true)}
                >
                  {pending.confirmLabel ?? 'Confirmar'}
                </button>
              </div>
            </Sheet>
          )}
          {/* Centred, not a bottom drawer: this interrupts to say the app is in a
              state the user did not expect, and it must be read before it is
              answered. Dismissing it — X, backdrop, Escape — always means "do
              nothing", never one of the options. */}
          {choosing && (
            <Sheet title={choosing.title} centred onClose={() => settleChoice(null)}>
              {choosing.message && (
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                  {choosing.message}
                </p>
              )}
              <div className="choice-actions">
                {choosing.options.map((o) => (
                  <div key={o.id}>
                    <button
                      className={`btn ${o.tone ?? 'subtle'}`}
                      disabled={o.disabled}
                      onClick={() => settleChoice(o.id)}
                    >
                      {o.label}
                    </button>
                    {o.hint && <p className="choice-hint">{o.hint}</p>}
                  </div>
                ))}
              </div>
            </Sheet>
          )}
        </ChoiceCtx.Provider>
      </ConfirmCtx.Provider>
    </ToastCtx.Provider>
  )
}
