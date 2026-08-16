import { useEffect, useState } from 'react'

/**
 * Milliseconds since `startedAt`, refreshed once a second. `null` means nothing
 * is running: the value is 0 and no timer exists.
 *
 * Two things this deliberately does NOT do:
 *
 *   · **accumulate.** Every tick re-reads `Date.now()` instead of adding 1000,
 *     so a throttled or skipped interval costs a late repaint, never a wrong
 *     number. The elapsed time is a fact about the clock, and the interval is
 *     only what makes the screen ask again;
 *   · **persist.** There is nothing to store — `Session.startedAt` already is
 *     the start of the workout, so the counter survives a reload, a reinstall
 *     and a different device for free. A stored "elapsed" would be a second
 *     source of truth that drifts the moment the app is closed.
 *
 * A backgrounded PWA can have its timers suspended outright — an hour of
 * workout is an hour of the phone in a pocket — so returning to the app
 * re-reads the clock immediately rather than waiting out the next tick.
 */
export function useElapsed(startedAt: number | null): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (startedAt == null) return
    const tick = () => setNow(Date.now())
    tick() // the session may have started long before this mount
    const id = setInterval(tick, 1000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [startedAt])

  // Never negative: a clock skew (or a device whose time was corrected mid
  // workout) would otherwise render a session that has not started yet.
  return startedAt == null ? 0 : Math.max(0, now - startedAt)
}
