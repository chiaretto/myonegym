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
