import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useElapsed } from './elapsed'

const START = 1_700_000_000_000

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(START)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useElapsed', () => {
  it('opens on the real gap, not on zero', () => {
    // The session started an hour and a half ago and the screen is only being
    // mounted now — a reload mid-workout must not restart the count.
    const { result } = renderHook(() => useElapsed(START - 5_400_000))
    expect(result.current).toBe(5_400_000)
  })

  it('advances once a second', () => {
    const { result } = renderHook(() => useElapsed(START))
    act(() => {
      vi.advanceTimersByTime(3_000)
    })
    expect(result.current).toBe(3_000)
  })

  it('re-reads the clock instead of accumulating ticks', () => {
    const { result } = renderHook(() => useElapsed(START))
    // The tab was suspended for an hour and only now gets a single tick. The
    // answer is the elapsed hour, not the one second that fired.
    act(() => {
      vi.setSystemTime(START + 3_599_000)
      vi.advanceTimersByTime(1_000)
    })
    expect(result.current).toBe(3_600_000)
  })

  it('resyncs when the app returns to the foreground', () => {
    const { result } = renderHook(() => useElapsed(START))
    act(() => {
      vi.setSystemTime(START + 42_000)
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(result.current).toBe(42_000)
  })

  it('is zero and schedules nothing when nothing is running', () => {
    const { result } = renderHook(() => useElapsed(null))
    act(() => {
      vi.advanceTimersByTime(5_000)
    })
    expect(result.current).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('stops ticking once unmounted', () => {
    const { unmount } = renderHook(() => useElapsed(START))
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('never reports a negative span', () => {
    // A device whose clock was corrected backwards mid-workout.
    const { result } = renderHook(() => useElapsed(START + 10_000))
    expect(result.current).toBe(0)
  })
})
