import { afterEach, describe, expect, it } from 'vitest'
import { render, cleanup, act } from '@testing-library/react'
import { useKeyboardInset } from './keyboardInset'

/** A controllable stand-in for window.visualViewport (jsdom has none). */
class FakeVisualViewport extends EventTarget {
  height: number
  offsetTop = 0
  constructor(height: number) {
    super()
    this.height = height
  }
  set(height: number, offsetTop = 0) {
    this.height = height
    this.offsetTop = offsetTop
    this.dispatchEvent(new Event('resize'))
  }
}

function Harness() {
  useKeyboardInset()
  return null
}

const insetVar = () => document.documentElement.style.getPropertyValue('--kb-inset')

afterEach(() => {
  cleanup()
  // @ts-expect-error test cleanup
  delete window.visualViewport
  document.documentElement.style.removeProperty('--kb-inset')
})

describe('useKeyboardInset publishes --kb-inset from visualViewport', () => {
  it('follows the keyboard opening and closing', () => {
    const vv = new FakeVisualViewport(844)
    Object.defineProperty(window, 'visualViewport', { value: vv, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 844, configurable: true })

    render(<Harness />)
    expect(insetVar()).toBe('0px') // keyboard closed on mount

    act(() => vv.set(524)) // keyboard opens, ~320px
    expect(insetVar()).toBe('320px')

    act(() => vv.set(424, 100)) // page scrolled under the keyboard
    expect(insetVar()).toBe('320px') // still 320, offsetTop accounted for

    act(() => vv.set(844)) // keyboard closes
    expect(insetVar()).toBe('0px')
  })

  it('is a no-op (and leaves no reservation) without visualViewport', () => {
    // window.visualViewport is undefined (cleared in afterEach / not set here).
    render(<Harness />)
    expect(insetVar()).toBe('') // never set
  })

  it('removes the variable and listeners on unmount', () => {
    const vv = new FakeVisualViewport(844)
    Object.defineProperty(window, 'visualViewport', { value: vv, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 844, configurable: true })

    const { unmount } = render(<Harness />)
    act(() => vv.set(524))
    expect(insetVar()).toBe('320px')

    unmount()
    expect(insetVar()).toBe('') // cleaned up
    // A late event after unmount must not resurrect the variable.
    act(() => vv.set(600))
    expect(insetVar()).toBe('')
  })
})
