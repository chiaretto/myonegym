/**
 * Takes down the boot splash that index.html paints on the first frame.
 *
 * The element is plain DOM outside the React tree — it has to exist before any
 * JavaScript runs — so removing it is plain DOM too, rather than state React
 * would only get to act on after it has already mounted.
 */

/** Mirrors the `transition` on #splash in index.html. The element is removed
 *  rather than left transparent, so it can never swallow a tap. */
const FADE_MS = 320

/**
 * How long the splash stays up, measured from navigation start.
 *
 * On a warm start the app is ready in well under this, and without a floor the
 * splash would appear and vanish inside a couple of frames — read as a glitch,
 * not as branding. On a cold start the app is the slow one and this floor has
 * already passed, so it costs nothing.
 */
const MIN_VISIBLE_MS = 600

/**
 * Backstop for when the paint signal never arrives.
 *
 * requestAnimationFrame does not fire at all in a tab the browser is not
 * compositing — a background tab, a PWA launched behind another window. Without
 * this timer the splash would sit there at z-index max, opaque and covering a
 * fully working app, until the tab was brought forward. A timer is throttled in
 * that state but still fires, so it is the only signal that cannot be withheld.
 */
const MAX_VISIBLE_MS = 4000

export function dismissBootSplash() {
  // Absent under test (jsdom renders no index.html), and after the first call
  // wins the race below. Either way there is nothing left to take down.
  if (!document.getElementById('splash')) return

  // performance.now() is milliseconds since the navigation started, which is as
  // close to "when the user tapped the icon" as the page can observe.
  const remaining = Math.max(0, MIN_VISIBLE_MS - performance.now())

  window.setTimeout(() => {
    const el = document.getElementById('splash')
    if (!el) return
    el.dataset.leaving = ''
    window.setTimeout(() => el.remove(), FADE_MS)
  }, remaining)
}

/**
 * Arms both routes to dismissal and lets whichever arrives first win.
 *
 * The frame callback is the one we want: two frames deep, so it runs after the
 * browser has actually painted the tree React just committed, and there is
 * something real underneath to uncover. The timer only matters when that
 * callback never comes.
 */
export function scheduleBootSplashDismissal() {
  requestAnimationFrame(() => requestAnimationFrame(dismissBootSplash))
  window.setTimeout(dismissBootSplash, MAX_VISIBLE_MS)
}
