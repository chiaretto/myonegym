import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MAX_REST_MS, useRestTimer } from './restTimer'

/**
 * The rest stopwatch's state.
 *
 * What is worth testing here is the part that has no screen: a count that has to
 * survive the app being closed, and a limit that has to arrive by the clock
 * rather than by anyone watching.
 */

beforeEach(() => {
  localStorage.clear()
  useRestTimer.setState({ startedAt: null })
})
afterEach(() => vi.useRealTimers())

describe('the rest timer store', () => {
  it('keeps the start instant, and nothing else', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000_000)
    useRestTimer.getState().start()
    expect(useRestTimer.getState().startedAt).toBe(1_000_000)

    // No elapsed anywhere: it is derived from the clock, so there is nothing
    // here to age while the app is closed.
    expect(Object.keys(useRestTimer.getState()).filter((k) => k.includes('lapsed'))).toEqual([])
  })

  it('stops by zeroing — there is no pause that keeps the value', () => {
    useRestTimer.getState().start()
    useRestTimer.getState().stop()
    expect(useRestTimer.getState().startedAt).toBeNull()
  })

  it('toggles there and back', () => {
    useRestTimer.getState().toggle()
    expect(useRestTimer.getState().startedAt).not.toBeNull()
    useRestTimer.getState().toggle()
    expect(useRestTimer.getState().startedAt).toBeNull()
  })

  it('writes the start instant where preferences live, not where data lives', () => {
    useRestTimer.getState().start()
    // localStorage, like activeGym and settings. A rest is not history: what a
    // workout records is what was done, not how long was rested.
    const stored = localStorage.getItem('myonegym.restTimer')
    expect(stored).toBeTruthy()
    expect(JSON.parse(stored!).state.startedAt).toBe(useRestTimer.getState().startedAt)
  })

  describe('the 99-minute limit', () => {
    it('leaves a count that is still within it alone', () => {
      const now = 5_000_000
      useRestTimer.setState({ startedAt: now - MAX_REST_MS + 1000 })
      useRestTimer.getState().expire(now)
      expect(useRestTimer.getState().startedAt).not.toBeNull()
    })

    it('stops one that has reached it', () => {
      const now = 5_000_000
      useRestTimer.setState({ startedAt: now - MAX_REST_MS })
      useRestTimer.getState().expire(now)
      expect(useRestTimer.getState().startedAt).toBeNull()
    })

    it('measures against the clock, not against time spent with the app open', () => {
      // Left running last night. It must arrive stopped this morning, not start
      // a fresh 99 minutes from the moment the app is reopened.
      const now = 5_000_000
      useRestTimer.setState({ startedAt: now - 10 * 60 * 60 * 1000 })
      useRestTimer.getState().expire(now)
      expect(useRestTimer.getState().startedAt).toBeNull()
    })

    it('stops exactly the way a second tap would', () => {
      // Not frozen at 99:00 — that would be an alarm nobody can switch off
      // without touching it.
      const now = 5_000_000
      useRestTimer.setState({ startedAt: now - MAX_REST_MS })
      useRestTimer.getState().expire(now)

      const stoppedByTap = { ...useRestTimer.getState() }
      useRestTimer.getState().start()
      useRestTimer.getState().stop()
      expect(useRestTimer.getState().startedAt).toBe(stoppedByTap.startedAt)
    })

    it('is 99 minutes, which is what keeps the display at two digits', () => {
      expect(MAX_REST_MS).toBe(99 * 60 * 1000)
    })
  })

  it('comes back running after the app is closed and reopened', () => {
    vi.useFakeTimers()
    vi.setSystemTime(2_000_000)
    useRestTimer.getState().start()

    // What a restart is: the store is built again from what was written.
    vi.setSystemTime(2_000_000 + 3 * 60 * 1000)
    useRestTimer.persist.rehydrate()

    expect(useRestTimer.getState().startedAt).toBe(2_000_000)
  })

  it('comes back stopped when it expired while the app was closed', () => {
    vi.useFakeTimers()
    vi.setSystemTime(2_000_000)
    useRestTimer.getState().start()

    vi.setSystemTime(2_000_000 + MAX_REST_MS + 1)
    useRestTimer.persist.rehydrate()

    expect(useRestTimer.getState().startedAt).toBeNull()
  })
})
