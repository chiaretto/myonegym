import { create } from 'zustand'

/**
 * Install-to-home-screen state.
 *
 * Chromium fires `beforeinstallprompt` **once, early in page load**, and the
 * event is the only handle on the native install dialog. A listener registered
 * inside a React effect on the Settings screen would therefore miss it in
 * practice, which is why `initInstall()` runs from main.tsx before the first
 * render and parks the event here.
 *
 * Nothing here is persisted, unlike the font scale: installability belongs to
 * this browser session. A stored value would keep claiming the app is installed
 * after the user removed it (or the reverse) with no way to notice.
 *
 * iOS has no equivalent event — Safari only offers the manual
 * Share → "Add to Home Screen" path — so there the UI shows instructions
 * instead of a button. See openspec app-foundation, "Install the App From
 * Settings".
 */

/** Not in lib.dom: Chromium-only, and still non-standard. */
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt: () => Promise<void>
}

export type InstallPlatform = 'android' | 'ios' | 'other'

export type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable'

interface InstallState {
  /** The browser offered a native install dialog and it has not been used yet. */
  canInstall: boolean
  /** Running from the home screen, or installed during this session. */
  isInstalled: boolean
  platform: InstallPlatform
  /** Opens the native dialog. Resolves 'unavailable' if there is nothing to open. */
  promptInstall: () => Promise<InstallOutcome>
}

/** The parked event. Kept out of the store: it is a live browser object, not
 *  state, and it may be spent exactly once. */
let deferred: BeforeInstallPromptEvent | null = null

export function detectPlatform(ua = navigator.userAgent): InstallPlatform {
  if (/Android/i.test(ua)) return 'android'
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  // iPadOS 13+ reports itself as a Mac; the touch points give it away.
  if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return 'ios'
  return 'other'
}

export function isStandalone(): boolean {
  // `navigator.standalone` is the iOS-only signal; display-mode covers the rest.
  if ((navigator as { standalone?: boolean }).standalone === true) return true
  if (typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(display-mode: standalone)').matches
}

export const useInstall = create<InstallState>()((set) => ({
  canInstall: false,
  isInstalled: false,
  platform: 'other',

  promptInstall: async () => {
    const event = deferred
    if (!event) return 'unavailable'
    // Spend the event before awaiting: it cannot be prompted twice, and leaving
    // the button enabled through the dialog would invite a second, throwing call.
    deferred = null
    set({ canInstall: false })

    await event.prompt()
    const { outcome } = await event.userChoice
    // `appinstalled` also fires on acceptance, but not on every browser and not
    // always promptly — the screen should not sit on a stale "install me".
    if (outcome === 'accepted') set({ isInstalled: true })
    return outcome
  },
}))

/**
 * Wires the browser events. Call once, before the first render.
 * Returns a teardown so tests can start from a clean slate.
 */
export function initInstall(): () => void {
  deferred = null
  useInstall.setState({
    canInstall: false,
    isInstalled: isStandalone(),
    platform: detectPlatform(),
  })

  const onBeforeInstallPrompt = (e: Event) => {
    // Without preventDefault Chromium may show its own mini-infobar, and the
    // event would not stay usable for our own button.
    e.preventDefault()
    deferred = e as BeforeInstallPromptEvent
    useInstall.setState({ canInstall: true })
  }

  const onAppInstalled = () => {
    deferred = null
    useInstall.setState({ canInstall: false, isInstalled: true })
  }

  window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  window.addEventListener('appinstalled', onAppInstalled)

  return () => {
    window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.removeEventListener('appinstalled', onAppInstalled)
    deferred = null
  }
}
