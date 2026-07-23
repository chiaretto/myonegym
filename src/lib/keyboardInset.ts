import { useEffect } from 'react'

/**
 * How much an on-screen keyboard occludes the **bottom of the layout viewport**.
 *
 * `position: fixed; bottom: 0` anchors to the layout viewport; the mobile
 * keyboard (Android by default) shrinks only the **visual** viewport, so a fixed
 * bar stays pinned behind the keyboard. This is the gap to lift it by.
 *
 * `offsetTop` matters: when the page itself scrolls under the keyboard the visual
 * viewport is pushed down, so the occlusion is the layout height minus the visual
 * viewport's height **and** its top offset. Clamped to ≥ 0 (0 = no keyboard).
 */
export function keyboardInset(m: {
  innerHeight: number
  vvHeight: number
  vvOffsetTop: number
}): number {
  return Math.max(0, Math.round(m.innerHeight - (m.vvHeight + m.vvOffsetTop)))
}

/**
 * Publishes `--kb-inset` on <html> — the keyboard occlusion in px — so fixed
 * bottom chrome (`.action-bar`, `.toast`) can lift above the keyboard. One global
 * listener; mount once at the app root. No-op where `visualViewport` is absent
 * (the variable stays unset → `var(--kb-inset, 0px)` is 0, today's behaviour).
 */
export function useKeyboardInset(): void {
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const root = document.documentElement
    const update = () => {
      const inset = keyboardInset({
        innerHeight: window.innerHeight,
        vvHeight: vv.height,
        vvOffsetTop: vv.offsetTop,
      })
      root.style.setProperty('--kb-inset', `${inset}px`)
    }
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
      root.style.removeProperty('--kb-inset')
    }
  }, [])
}
