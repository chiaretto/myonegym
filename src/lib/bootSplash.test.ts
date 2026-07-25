import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { dismissBootSplash, scheduleBootSplashDismissal } from './bootSplash'

/** The overlay index.html paints before any JavaScript runs. */
function mountSplash() {
  const el = document.createElement('div')
  el.id = 'splash'
  document.body.appendChild(el)
  return el
}

const splash = () => document.getElementById('splash')

describe('boot splash', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: 0 })
    // The floor is measured against performance.now(), which fake timers do not
    // control. Tying it to the faked wall clock keeps the two in step: without
    // this it stays frozen at 0, and a dismissal triggered at t=4000 would look
    // like it still owed the full 600ms of floor.
    vi.spyOn(performance, 'now').mockImplementation(() => Date.now())
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    document.getElementById('splash')?.remove()
  })

  it('holds the splash up for a minimum time, then fades and removes it', () => {
    mountSplash()
    dismissBootSplash()

    // Still up: dismissing on the same frame the app renders would flash.
    vi.advanceTimersByTime(599)
    expect(splash()).not.toBeNull()
    expect(splash()!.dataset.leaving).toBeUndefined()

    // Fading, but still in the DOM — removing it here would cut the fade.
    vi.advanceTimersByTime(1)
    expect(splash()!.dataset.leaving).toBe('')

    vi.advanceTimersByTime(320)
    expect(splash()).toBeNull()
  })

  it('does not pad the wait when the app was already slow to start', () => {
    vi.setSystemTime(5000)
    mountSplash()
    dismissBootSplash()

    // The floor is measured from navigation start, not from this call, so a
    // cold start that already outlasted it hands over immediately.
    vi.advanceTimersByTime(0)
    expect(splash()!.dataset.leaving).toBe('')
  })

  it('still comes down when the tab never paints a frame', () => {
    // requestAnimationFrame does not fire at all while a tab is not being
    // composited. If that were the only route to dismissal, the splash would
    // cover a working app indefinitely.
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 0),
    )
    mountSplash()
    scheduleBootSplashDismissal()

    // Still up well after the frame callback would have run, since it never
    // does — this is the state the backstop exists to escape.
    vi.advanceTimersByTime(1000)
    expect(splash()).not.toBeNull()

    // Exact timing is test one's job; all that matters here is that it ends.
    vi.advanceTimersByTime(5000)
    expect(splash()).toBeNull()
    vi.unstubAllGlobals()
  })

  it('is a no-op when there is no splash to dismiss', () => {
    expect(() => dismissBootSplash()).not.toThrow()
    vi.advanceTimersByTime(10_000)
    expect(splash()).toBeNull()
  })
})
