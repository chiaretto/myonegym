import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'

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
