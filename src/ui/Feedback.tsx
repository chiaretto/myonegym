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

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingConfirm | null>(null)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2600)
  }, [])

  const confirm = useCallback(
    (opts: ConfirmOpts) =>
      new Promise<boolean>((resolve) => setPending({ ...opts, resolve })),
    [],
  )

  const settle = (ok: boolean) => {
    pending?.resolve(ok)
    setPending(null)
  }

  return (
    <ToastCtx.Provider value={showToast}>
      <ConfirmCtx.Provider value={confirm}>
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
      </ConfirmCtx.Provider>
    </ToastCtx.Provider>
  )
}
