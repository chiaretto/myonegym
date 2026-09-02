import { create } from 'zustand'
import { registerSW } from 'virtual:pwa-register'

/**
 * Bringing a new version to a device that will not ask for one.
 *
 * The browser only fetches a new `sw.js` on a **navigation** inside the service
 * worker's scope. A tab meets that trigger every time it reloads; the installed
 * app does not — `display: standalone` is opened, suspended and resumed without
 * ever navigating, so it can keep serving a build from weeks ago. That is the
 * bug this module exists for.
 *
 * Two answers, and both need the same thing — a handle on the
 * `ServiceWorkerRegistration`:
 *
 * - the button in Settings → "Atualizar app", which calls `checkForUpdate()`;
 * - a silent check at start-up and whenever the app comes back to the
 *   foreground, which is the navigation-shaped moment standalone never has.
 *
 * That handle is why the app registers the worker itself instead of letting
 * vite-plugin-pwa inject `registerSW.js` into index.html (`injectRegister: null`
 * in vite.config.ts — with both, the same worker would be registered twice).
 *
 * Applying is NOT this module's job: the project builds with
 * `registerType: 'autoUpdate'`, so a worker that installs also activates
 * (`skipWaiting`/`clientsClaim`) and the plugin's own registration reloads the
 * page. All we add is the trigger, plus enough state for the screen to say
 * which of the three things happened.
 *
 * Nothing here is persisted, for the same reason as `lib/install.ts`: this is
 * browser-session state, and a stored copy would go on describing a service
 * worker that is no longer there.
 */

/** Version and build stamp, injected by `define` — see scripts/buildInfo.ts. */
export const buildInfo = {
  version: __APP_VERSION__,
  /** `null` when the stamp is not a date the browser can parse. */
  builtAt: Number.isNaN(Date.parse(__BUILD_TIME__)) ? null : new Date(__BUILD_TIME__),
} as const

/**
 * How long two automatic checks must be apart.
 *
 * Without a floor, every alt-tab would cost a network request: switching apps
 * to read one message and coming back would check, and check again, and again.
 * Fifteen minutes is far below how often a version is published here and far
 * above how often someone leaves and returns to the app — and the button in
 * Settings is always there for anyone who wants it *now*.
 */
export const MIN_AUTO_CHECK_INTERVAL_MS = 15 * 60 * 1000

export type UpdateStatus =
  /** No service worker registered: nothing here can work, and the screen says so. */
  | 'unsupported'
  /** Registered, nothing attempted yet. */
  | 'idle'
  | 'checking'
  /** The check finished and this is already the newest build. */
  | 'uptodate'
  /** A new version was found and is being applied — the page is about to reload. */
  | 'updating'
  /** The check itself failed. Offline is the usual reason. */
  | 'error'

interface AppUpdateState {
  status: UpdateStatus
  /** When a check last completed, automatic or manual. `null` = never. */
  lastCheckedAt: number | null
  /** Checks now, on purpose, and reports what happened. */
  checkForUpdate: () => Promise<UpdateStatus>
}

/** Kept out of the store: a live browser object, not state. Same reason as the
 *  deferred install event in `lib/install.ts`. */
let registration: ServiceWorkerRegistration | undefined
let lastAutoCheckAt = 0

/**
 * True on the screens of a workout in progress (`/session/:id`, and the entry
 * screen below it), where a reload would cost the running rest timer and the
 * scroll position. Tolerates the production base path, and deliberately does
 * NOT match `/sessions` — the Consistência list is history, not a workout.
 */
export function isWorkoutScreen(pathname: string): boolean {
  return /(^|\/)session\/[^/]/.test(pathname)
}

/**
 * One check against the server.
 *
 * `updatefound` is what separates "found a new version" from "already current":
 * it fires while the new worker starts installing, before `update()` resolves.
 * Reading `registration.installing` afterwards is not enough on its own —
 * with `skipWaiting` the new worker may already have moved on by then.
 */
async function runCheck(reg: ServiceWorkerRegistration): Promise<'found' | 'none' | 'error'> {
  let found = false
  const onUpdateFound = () => {
    found = true
  }
  reg.addEventListener('updatefound', onUpdateFound)
  try {
    await reg.update()
  } catch {
    return 'error'
  } finally {
    reg.removeEventListener('updatefound', onUpdateFound)
  }
  return found || reg.installing || reg.waiting ? 'found' : 'none'
}

export const useAppUpdate = create<AppUpdateState>()((set) => ({
  status: 'unsupported',
  lastCheckedAt: null,

  checkForUpdate: async () => {
    const reg = registration
    if (!reg) return 'unsupported'

    set({ status: 'checking' })
    const outcome = await runCheck(reg)
    // A manual check counts as a check for the automatic schedule too: the user
    // just asked the same question it would have asked.
    lastAutoCheckAt = Date.now()

    if (outcome === 'error') {
      set({ status: 'error' })
      return 'error'
    }
    // 'updating' is often the last thing this tab ever renders: autoUpdate
    // reloads the page as soon as the new worker activates.
    const status = outcome === 'found' ? 'updating' : 'uptodate'
    set({ status, lastCheckedAt: Date.now() })
    return status
  },
}))

/**
 * The check nobody asked for: start-up and every return to the foreground.
 *
 * Silent by contract — it never touches `status`, so no screen changes shape
 * and a failure (offline, the common case) is not reported to someone who did
 * not ask a question. Finding a new version still applies it, through the same
 * autoUpdate reload as the manual path.
 */
async function autoCheck(): Promise<void> {
  const reg = registration
  if (!reg) return
  if (Date.now() - lastAutoCheckAt < MIN_AUTO_CHECK_INTERVAL_MS) return
  // Deferred, not cancelled: the next foreground return outside the workout
  // gets it. Reloading mid-set would take the rest timer with it.
  if (isWorkoutScreen(window.location.pathname)) return

  lastAutoCheckAt = Date.now()
  const outcome = await runCheck(reg)
  if (outcome !== 'error') useAppUpdate.setState({ lastCheckedAt: Date.now() })
}

/**
 * Registers the service worker and wires the automatic checks. Call once, from
 * main.tsx, before the first render — alongside `initInstall()`.
 * Returns a teardown so tests can start from a clean slate.
 */
export function initAppUpdate(): () => void {
  registration = undefined
  lastAutoCheckAt = 0
  useAppUpdate.setState({ status: 'unsupported', lastCheckedAt: null })

  registerSW({
    immediate: true,
    onRegisteredSW: (_swScriptUrl, reg) => {
      if (!reg) return
      registration = reg
      useAppUpdate.setState({ status: 'idle' })
      void autoCheck()
    },
    // Registration can fail for reasons the user cannot act on (no secure
    // context, no support). The screen keeps saying "unsupported", which is
    // exactly what the situation is.
    onRegisterError: () => {},
  })

  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') void autoCheck()
  }
  document.addEventListener('visibilitychange', onVisibilityChange)

  return () => {
    document.removeEventListener('visibilitychange', onVisibilityChange)
    registration = undefined
    lastAutoCheckAt = 0
    // Back to the pre-registration state, not just "listener removed": the
    // store is module state, so a status left behind would follow the next
    // test into a browser that has no service worker at all.
    useAppUpdate.setState({ status: 'unsupported', lastCheckedAt: null })
  }
}
