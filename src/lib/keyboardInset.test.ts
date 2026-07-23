import { describe, expect, it } from 'vitest'
import { keyboardInset } from './keyboardInset'

describe('keyboardInset', () => {
  it('is 0 when the visual viewport fills the layout viewport (no keyboard)', () => {
    expect(keyboardInset({ innerHeight: 844, vvHeight: 844, vvOffsetTop: 0 })).toBe(0)
  })

  it('equals the keyboard height when the keyboard shrinks the visual viewport', () => {
    // 844 layout, keyboard takes 320 → visual viewport is 524, no scroll offset.
    expect(keyboardInset({ innerHeight: 844, vvHeight: 524, vvOffsetTop: 0 })).toBe(320)
  })

  it('accounts for offsetTop when the page scrolls under the keyboard', () => {
    // Same 320px keyboard, but the page scrolled 100px → the viewport is offset,
    // yet the occlusion at the bottom is still 320, not 420.
    expect(keyboardInset({ innerHeight: 844, vvHeight: 424, vvOffsetTop: 100 })).toBe(320)
  })

  it('never goes negative (e.g. transient values while the keyboard closes)', () => {
    expect(keyboardInset({ innerHeight: 844, vvHeight: 900, vvOffsetTop: 0 })).toBe(0)
  })

  it('rounds sub-pixel viewport metrics', () => {
    expect(keyboardInset({ innerHeight: 844, vvHeight: 523.6, vvOffsetTop: 0 })).toBe(320)
  })
})
