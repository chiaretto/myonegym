import type { RegisterSWOptions } from 'vite-plugin-pwa/types'

/**
 * Stands in for `virtual:pwa-register` during the test run.
 *
 * The virtual module only exists while vite-plugin-pwa is loaded, and the
 * plugin is not part of the vitest pipeline — so `src/lib/appUpdate.ts` would
 * fail to resolve its import. `vitest.config.ts` aliases the specifier here.
 *
 * The default state is the honest one for jsdom: **no service worker**, so
 * `onRegisteredSW` never fires and the app treats updating as unsupported. A
 * test that wants the other branch calls `setFakeRegistration()` first.
 *
 * Deliberately synchronous, unlike the real thing (which awaits a dynamic
 * import of workbox-window): a callback that fires on a later microtask is one
 * more ordering rule for every test to get right, and nothing here is testing
 * the plugin's own timing.
 */

let registration: ServiceWorkerRegistration | undefined
let registerError: unknown

/** The last options `registerSW` was called with — lets a test drive the
 *  plugin's own callbacks. */
export let lastOptions: RegisterSWOptions | undefined

/** What a `update()` on the double does. */
export type FakeUpdateOutcome =
  /** Resolves having found nothing — already the newest build. */
  | 'none'
  /** Fires `updatefound`, as the browser does when a new worker installs. */
  | 'found'
  /** Rejects, the way an offline fetch does. */
  | 'fail'

export interface FakeRegistration extends ServiceWorkerRegistration {
  /** How many times `update()` was called — the assertion for the interval floor. */
  updateCalls: number
  /** Change what the next `update()` does. */
  setOutcome: (outcome: FakeUpdateOutcome) => void
}

/**
 * Registration double built on a real `EventTarget`, because the app listens for
 * `updatefound` — that event is what separates "found a new version" from
 * "already current", so a double that cannot dispatch it cannot exercise the
 * branch that matters.
 */
export function fakeRegistration(outcome: FakeUpdateOutcome = 'none'): FakeRegistration {
  const target = new EventTarget()
  const reg = Object.assign(target, {
    updateCalls: 0,
    installing: null,
    waiting: null,
    setOutcome(next: FakeUpdateOutcome) {
      outcome = next
    },
    async update() {
      reg.updateCalls += 1
      if (outcome === 'fail') throw new TypeError('Failed to fetch')
      if (outcome === 'found') target.dispatchEvent(new Event('updatefound'))
    },
  })
  return reg as unknown as FakeRegistration
}

/** Make the next `registerSW()` report a registered service worker. */
export function setFakeRegistration(reg: ServiceWorkerRegistration | undefined): void {
  registration = reg
  registerError = undefined
}

/** Make the next `registerSW()` fail, as a browser without a secure context does. */
export function setRegisterError(error: unknown): void {
  registration = undefined
  registerError = error
}

/** Back to "no service worker here" — call from `beforeEach`. */
export function resetPwaRegister(): void {
  registration = undefined
  registerError = undefined
  lastOptions = undefined
}

export function registerSW(options: RegisterSWOptions = {}): (reloadPage?: boolean) => Promise<void> {
  lastOptions = options
  if (registerError !== undefined) options.onRegisterError?.(registerError)
  else if (registration) options.onRegisteredSW?.('sw.js', registration)
  return async () => {}
}
