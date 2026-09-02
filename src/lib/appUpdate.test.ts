import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fakeRegistration,
  resetPwaRegister,
  setFakeRegistration,
  setRegisterError,
  type FakeRegistration,
} from '../test/pwaRegister'
import {
  MIN_AUTO_CHECK_INTERVAL_MS,
  initAppUpdate,
  isWorkoutScreen,
  useAppUpdate,
} from './appUpdate'

let teardown: (() => void) | undefined

/** Time is read through `Date.now()` only, so a stub is enough — no fake timers,
 *  which would also stop `vi.waitFor` from polling. */
let now = 1_700_000_000_000
function advance(ms: number) {
  now += ms
}

/** Registers with a working service worker and returns its double. The boot
 *  check has already run by the time this returns. */
function initWithWorker(outcome: Parameters<typeof fakeRegistration>[0] = 'none'): FakeRegistration {
  const reg = fakeRegistration(outcome)
  setFakeRegistration(reg)
  teardown = initAppUpdate()
  return reg
}

function goTo(pathname: string) {
  window.history.replaceState({}, '', pathname)
}

beforeEach(() => {
  now = 1_700_000_000_000
  vi.spyOn(Date, 'now').mockImplementation(() => now)
  goTo('/')
})

afterEach(() => {
  teardown?.()
  teardown = undefined
  resetPwaRegister()
  vi.restoreAllMocks()
})

describe('isWorkoutScreen', () => {
  it('matches the workout screens, under any base path', () => {
    expect(isWorkoutScreen('/session/3')).toBe(true)
    expect(isWorkoutScreen('/session/3/entry/7')).toBe(true)
    expect(isWorkoutScreen('/myonegym/session/3')).toBe(true)
  })

  it('does not match the history list or the rest of the app', () => {
    // /sessions is Consistência — history, not a workout in progress.
    expect(isWorkoutScreen('/sessions')).toBe(false)
    expect(isWorkoutScreen('/')).toBe(false)
    expect(isWorkoutScreen('/settings/update')).toBe(false)
  })
})

describe('without a service worker', () => {
  it('stays unsupported and checking does nothing', async () => {
    teardown = initAppUpdate()

    expect(useAppUpdate.getState().status).toBe('unsupported')
    await expect(useAppUpdate.getState().checkForUpdate()).resolves.toBe('unsupported')
    expect(useAppUpdate.getState().status).toBe('unsupported')
  })

  it('stays unsupported when registration fails', () => {
    setRegisterError(new Error('no secure context'))
    teardown = initAppUpdate()

    expect(useAppUpdate.getState().status).toBe('unsupported')
  })
})

describe('checkForUpdate', () => {
  it('reports the app is already current', async () => {
    initWithWorker('none')

    await expect(useAppUpdate.getState().checkForUpdate()).resolves.toBe('uptodate')
    expect(useAppUpdate.getState().status).toBe('uptodate')
    expect(useAppUpdate.getState().lastCheckedAt).toBe(now)
  })

  it('reports a new version being applied', async () => {
    initWithWorker('found')

    await expect(useAppUpdate.getState().checkForUpdate()).resolves.toBe('updating')
    expect(useAppUpdate.getState().status).toBe('updating')
  })

  it('reports a failed check without claiming it checked', async () => {
    initWithWorker('fail')

    await expect(useAppUpdate.getState().checkForUpdate()).resolves.toBe('error')
    expect(useAppUpdate.getState().status).toBe('error')
    expect(useAppUpdate.getState().lastCheckedAt).toBeNull()
  })

  it('works on a workout screen — the guard is only for automatic checks', async () => {
    const reg = initWithWorker('none')
    const before = reg.updateCalls
    goTo('/session/3')

    await expect(useAppUpdate.getState().checkForUpdate()).resolves.toBe('uptodate')
    expect(reg.updateCalls).toBe(before + 1)
  })
})

describe('automatic checks', () => {
  it('checks once at start-up', () => {
    const reg = initWithWorker()

    expect(reg.updateCalls).toBe(1)
    expect(useAppUpdate.getState().status).toBe('idle')
  })

  it('checks again when the app returns to the foreground', async () => {
    const reg = initWithWorker()
    advance(MIN_AUTO_CHECK_INTERVAL_MS)

    document.dispatchEvent(new Event('visibilitychange'))

    await vi.waitFor(() => expect(reg.updateCalls).toBe(2))
  })

  it('does not check again inside the minimum interval', async () => {
    const reg = initWithWorker()
    advance(MIN_AUTO_CHECK_INTERVAL_MS - 1)

    document.dispatchEvent(new Event('visibilitychange'))
    document.dispatchEvent(new Event('visibilitychange'))

    await Promise.resolve()
    expect(reg.updateCalls).toBe(1)
  })

  it('says nothing on screen, even when it fails', async () => {
    const reg = initWithWorker('fail')
    advance(MIN_AUTO_CHECK_INTERVAL_MS)

    document.dispatchEvent(new Event('visibilitychange'))

    await vi.waitFor(() => expect(reg.updateCalls).toBe(2))
    expect(useAppUpdate.getState().status).toBe('idle')
    expect(useAppUpdate.getState().lastCheckedAt).toBeNull()
  })

  it('is skipped during a workout, and happens once it is over', async () => {
    const reg = initWithWorker()
    goTo('/session/3')
    advance(MIN_AUTO_CHECK_INTERVAL_MS)

    document.dispatchEvent(new Event('visibilitychange'))
    await Promise.resolve()
    expect(reg.updateCalls).toBe(1)

    goTo('/')
    document.dispatchEvent(new Event('visibilitychange'))
    await vi.waitFor(() => expect(reg.updateCalls).toBe(2))
  })

  it('stops when torn down', async () => {
    const reg = initWithWorker()
    advance(MIN_AUTO_CHECK_INTERVAL_MS)

    teardown?.()
    teardown = undefined
    document.dispatchEvent(new Event('visibilitychange'))

    await Promise.resolve()
    expect(reg.updateCalls).toBe(1)
  })
})
