import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import { useWakeLock } from './wakeLock'

/**
 * jsdom implements no Wake Lock API, which is also the state of every browser
 * that never shipped it — so the stub here is both the test double and the
 * shape of the real thing.
 */
type Listener = () => void

function stubWakeLock(options: { rejects?: boolean } = {}) {
  const released: Listener[] = []
  const drop = () => {
    for (const fn of released) fn()
  }
  const release = vi.fn(async () => drop())
  const request = vi.fn(async () => {
    if (options.rejects) throw new Error('denied')
    return {
      release,
      addEventListener: (_: string, fn: Listener) => released.push(fn),
    } as unknown as WakeLockSentinel
  })
  Object.defineProperty(navigator, 'wakeLock', {
    value: { request },
    configurable: true,
  })
  return { request, release, drop }
}

function clearWakeLock() {
  Object.defineProperty(navigator, 'wakeLock', { value: undefined, configurable: true })
}

function setVisibility(state: DocumentVisibilityState, held?: { drop: () => void }) {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true })
  // A real browser takes the lock back when the page hides, and tells the
  // sentinel so by firing `release`. Without that half, the hook would have no
  // way to know it no longer holds anything.
  if (state === 'hidden') held?.drop()
  document.dispatchEvent(new Event('visibilitychange'))
}

function Probe({ active }: { active: boolean }) {
  useWakeLock(active)
  return null
}

afterEach(() => {
  cleanup()
  clearWakeLock()
  setVisibility('visible')
  vi.restoreAllMocks()
})

describe('useWakeLock', () => {
  it('holds the screen while active and lets go when it stops', async () => {
    const { request, release } = stubWakeLock()

    const view = render(<Probe active />)
    await act(async () => {})
    expect(request).toHaveBeenCalledWith('screen')
    expect(release).not.toHaveBeenCalled()

    view.rerender(<Probe active={false} />)
    expect(release).toHaveBeenCalled()
  })

  it('asks for nothing while inactive', async () => {
    const { request } = stubWakeLock()

    render(<Probe active={false} />)
    await act(async () => {})

    expect(request).not.toHaveBeenCalled()
  })

  it('lets go when the screen it was holding for goes away', async () => {
    const { release } = stubWakeLock()

    const view = render(<Probe active />)
    await act(async () => {})
    view.unmount()

    expect(release).toHaveBeenCalled()
  })

  it('asks again on returning to the app, because the browser drops it when hidden', async () => {
    const { request, drop } = stubWakeLock()

    render(<Probe active />)
    await act(async () => {})
    expect(request).toHaveBeenCalledTimes(1)

    // Hidden: the browser has taken the lock back, and asking now would reject.
    await act(async () => setVisibility('hidden', { drop }))
    expect(request).toHaveBeenCalledTimes(1)

    await act(async () => setVisibility('visible'))
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('does not ask while the document is hidden', async () => {
    const { request } = stubWakeLock()
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })

    render(<Probe active />)
    await act(async () => {})

    expect(request).not.toHaveBeenCalled()
  })

  it('survives a browser that refuses, and one that never had the API', async () => {
    const { request } = stubWakeLock({ rejects: true })
    expect(() => render(<Probe active />)).not.toThrow()
    await act(async () => {})
    expect(request).toHaveBeenCalled()

    cleanup()
    clearWakeLock()
    expect(() => render(<Probe active />)).not.toThrow()
  })

  it('releases a lock that arrives after it was no longer wanted', async () => {
    // The request is async: `active` can go false while it is still in flight,
    // and without the guard the screen would stay on after the timer stopped.
    const release = vi.fn(async () => {})
    let resolve: (s: WakeLockSentinel) => void = () => {}
    const request = vi.fn(
      () =>
        new Promise<WakeLockSentinel>((r) => {
          resolve = r
        }),
    )
    Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true })

    const view = render(<Probe active />)
    view.rerender(<Probe active={false} />)

    await act(async () => {
      resolve({ release, addEventListener: () => {} } as unknown as WakeLockSentinel)
    })

    expect(release).toHaveBeenCalled()
  })
})
