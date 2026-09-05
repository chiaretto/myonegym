import { useEffect } from 'react'

/**
 * Keeps the screen on while `active`.
 *
 * The rest timer is the reason this exists: the phone is on the bench, counting
 * down, and the user is looking at it from two metres away — exactly the
 * situation the system reads as "idle" and answers by turning the screen off.
 * A stopwatch you have to wake the phone to read is not a stopwatch.
 *
 * Deliberately scoped to the **rest** timer and not to the workout clock. That
 * one runs for the whole session, and holding the screen on for an hour would
 * be a battery bill the user never asked for; the rest between sets is a couple
 * of minutes, spent looking at the number.
 *
 * Three things the API makes necessary:
 *
 * - the browser **releases the lock when the page is hidden**, and does not give
 *   it back on return — so it is re-requested on `visibilitychange`;
 * - `request()` **rejects** rather than resolving falsy: a hidden document, a
 *   battery saver, a browser that never shipped it (Safari before 16.4). Every
 *   one of those is a fine outcome — the timer still counts, the screen just
 *   behaves as it normally would — so the failure is swallowed, not surfaced;
 * - it is **async**, so the request can resolve after the effect was torn down.
 *   The sentinel is released immediately in that case, or the screen would
 *   stay on after the timer stopped.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) return
    const api = navigator.wakeLock
    if (!api) return

    let cancelled = false
    let sentinel: WakeLockSentinel | null = null

    const acquire = async () => {
      // A request while hidden always rejects; waiting for the return is both
      // cheaper and quieter than catching it.
      if (cancelled || sentinel || document.visibilityState !== 'visible') return
      try {
        const held = await api.request('screen')
        if (cancelled) {
          void held.release()
          return
        }
        sentinel = held
        // The system can drop it on its own (battery saver kicking in). Clearing
        // the reference is what lets the next return to the app ask again.
        held.addEventListener('release', () => {
          if (sentinel === held) sentinel = null
        })
      } catch {
        // Denied or unsupported. The timer is unaffected; only the screen is.
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void acquire()
    }

    void acquire()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      void sentinel?.release()
      sentinel = null
    }
  }, [active])
}
