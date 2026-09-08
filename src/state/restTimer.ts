import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * The rest-between-sets stopwatch: **the instant it started**, and nothing else.
 *
 * It lives here rather than in the screen because a rest does not belong to a
 * screen. A set ends, the rest begins, and it is spent walking to the next
 * machine — which is exactly when the app used to change exercise and zero the
 * count, taking the number away at the moment it mattered most. Here it survives
 * changing tab, changing exercise, changing screen, and the app being closed and
 * reopened.
 *
 * **Only the start instant is stored.** The elapsed time stays derived from the
 * clock by `useElapsed`: a stored "elapsed" would be a second source of truth
 * that ages on its own while the app is closed, and would have to be kept
 * ticking by something. A start instant is a fact that does not age — coming
 * back half an hour later shows half an hour, having counted nothing meanwhile.
 *
 * `localStorage`, like every other preference (`activeGym`, `settings`), and
 * deliberately **not** the database: a rest is not history. What a workout
 * records is what was done, not how long was rested — so this must never reach
 * the session or the backup.
 */

/**
 * The longest a rest may run before the timer stops itself.
 *
 * A timer that never gives up is a timer left running overnight. Ninety-nine
 * minutes is far past any real rest and stops one digit short of a third, which
 * is what lets the display keep two.
 */
export const MAX_REST_MS = 99 * 60 * 1000

interface RestTimerState {
  /** When the current rest began; `null` when nothing is running. */
  startedAt: number | null
  start: () => void
  stop: () => void
  toggle: () => void
  /**
   * Stop a count that has already outlived `MAX_REST_MS`.
   *
   * Measured against the **clock**, not against time spent with the app open:
   * a timer left running last night has to arrive stopped this morning, not
   * start a fresh 99 minutes from the moment the app is reopened. Called on
   * load and on every tick, which is what makes the limit arrive on its own
   * rather than only when someone looks.
   */
  expire: (now?: number) => void
}

export const useRestTimer = create<RestTimerState>()(
  persist(
    (set, get) => ({
      startedAt: null,
      start: () => set({ startedAt: Date.now() }),
      // Stopping is zeroing: there is no pause that keeps the value. A rest
      // stopwatch is either counting this rest or counting nothing.
      stop: () => set({ startedAt: null }),
      toggle: () => (get().startedAt == null ? get().start() : get().stop()),
      expire: (now = Date.now()) => {
        const { startedAt } = get()
        if (startedAt != null && now - startedAt >= MAX_REST_MS) set({ startedAt: null })
      },
    }),
    {
      name: 'myonegym.restTimer',
      // A count that expired while the app was closed must arrive stopped, and
      // this is the first moment anything can say so.
      onRehydrateStorage: () => (state) => state?.expire(),
    },
  ),
)
