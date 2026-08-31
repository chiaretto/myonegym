import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
import { configure } from '@testing-library/react'
import { beforeEach } from 'vitest'

/**
 * How long `waitFor`, `findBy*` and friends keep looking before giving up.
 *
 * The Testing Library default is 1 s, calibrated — like vitest's test timeout —
 * for something much smaller than what this suite does. A single `findByRole`
 * here can be waiting on a whole `<App/>` mount plus a Dexie round trip; on a
 * loaded machine that crosses one second without anything being wrong. Three of
 * the five baseline runs failed exactly this way, on
 * `Unable to find role="button" and name "Começar do zero"`.
 *
 * Kept deliberately BELOW `testTimeout` (see vitest.config.ts). That ordering is
 * what preserves the error message: when an element genuinely never appears, the
 * async utility gives up first and says "Unable to find …", instead of the test
 * hitting its own ceiling and reporting a bare timeout with nothing to act on.
 */
configure({ asyncUtilTimeout: 5_000 })
import { clearQueryCache } from './src/lib/hooks'
import { installMemoryOpfs } from './src/test/memoryOpfs'

// jsdom has no storage API, so exercise photos would silently take their
// bytes-in-the-record fallback in every test. The shim gives them a real (if
// in-memory) file system, and resetting it per test keeps one test's files from
// showing up in the next one's orphan sweep.
beforeEach(() => {
  installMemoryOpfs()
})

// The read hooks keep each query's last resolved value in module state, so a
// revisited screen can paint before IndexedDB answers (see src/lib/hooks.ts).
// That state outlives both the component tree and the `table.clear()` a test
// does in teardown, so without this a list from one test would show up in the
// next test's first frame.
beforeEach(() => {
  clearQueryCache()
})

// jsdom implements no layout, and therefore no ResizeObserver — without this,
// any component that measures itself (see ui/StepperBar) throws on mount and
// takes the whole page down. Every browser the app targets has it natively
// (iOS Safari 13.4+), so this is a test-environment gap, not a product concern.
// Elements report a 0px height here, which is fine: the measurement only feeds a
// CSS reservation, and layout is verified in a real browser instead.
if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

// jsdom implements no layout, so no scrolling either — `scrollIntoView` is
// simply absent. The assistant thread calls it to follow the tail as messages
// arrive; without this the whole screen throws on its first render. Every target
// browser has it natively, so this is an environment gap like ResizeObserver
// above, and the scroll position itself is not something these tests assert on.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}

// jsdom's Blob/File lack `.text()` and `.arrayBuffer()` (both are standard in
// every target browser). The backup import reads the picked file via
// `file.text()`, so without this the whole import path is untestable. jsdom's
// FileReader can read its own Blobs, so polyfill through it.
if (typeof Blob !== 'undefined' && typeof Blob.prototype.text !== 'function') {
  const read = (blob: Blob, how: 'readAsText' | 'readAsArrayBuffer') =>
    new Promise((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve(r.result)
      r.onerror = () => reject(r.error)
      r[how](blob)
    })
  Blob.prototype.text = function () {
    return read(this, 'readAsText') as Promise<string>
  }
  Blob.prototype.arrayBuffer = function () {
    return read(this, 'readAsArrayBuffer') as Promise<ArrayBuffer>
  }
}
