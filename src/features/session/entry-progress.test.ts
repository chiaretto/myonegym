import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The arithmetic behind the current segment's marching stripes.
 *
 * Everything else about this strip is covered by
 * `entry-progress.integration.test.tsx`, which asserts the classes — and classes
 * are all a test can see, since the suite runs with `css: false` and jsdom paints
 * nothing.
 *
 * But one thing here is a **relationship between two declarations**, and getting
 * it wrong is invisible in every way a person would normally check: the stripes
 * still show, a screenshot still looks right, and the only symptom is a twitch
 * at the end of each loop. So the numbers are read out of the stylesheet and
 * compared. Crude, and the same trade `state/splashes.test.ts` already makes:
 * when a fact is spread across files, something has to hold them to each other.
 */
const css = readFileSync(resolve(__dirname, 'session.css'), 'utf8')

/** The block a selector opens, up to its closing brace. */
function rule(selector: string): string {
  const at = css.indexOf(selector)
  expect(at, `sem regra para ${selector}`).toBeGreaterThan(-1)
  return css.slice(at, css.indexOf('}', at))
}

describe('the current segment’s stripes', () => {
  it('travels exactly one period of the pattern', () => {
    // The gradient repeats every `period` px: a bar up to the first number, then
    // a gap to the second.
    const gradient = rule('.entry-seg.current:not(.done)::after')
    const stripe = /repeating-linear-gradient\(90deg,[\s\S]*? 0 (\d+)px,\s*transparent \1px (\d+)px\)/.exec(
      gradient,
    )
    expect(stripe, 'o gradiente mudou de forma').not.toBeNull()
    const period = Number(stripe![2])

    const travel = /translateX\((-?\d+)px\)/.exec(rule('@keyframes entry-seg-stripes'))
    expect(travel, 'a animação mudou de forma').not.toBeNull()

    // Any other distance and the pattern jumps every time the loop restarts.
    expect(Math.abs(Number(travel![1]))).toBe(period)
  })

  it('covers the whole segment at both ends of the cycle', () => {
    // Offset by one period and one period wider: at the start of the cycle the
    // left edge is covered, at the end the right edge is. A narrower overlay
    // would show bare accent sliding in from one side.
    const block = rule('.entry-seg.current:not(.done)::after')
    expect(block).toContain('left: -12px')
    expect(block).toContain('width: calc(100% + 12px)')
  })

  it('stops marching where less motion was asked for, without losing the stripes', () => {
    // `animation: none` and nothing else: the gradient stays, so current and
    // done — which now share a colour — stay distinguishable.
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'))
    expect(reduced).toContain('.entry-seg.current:not(.done)::after { animation: none; }')
    expect(reduced).not.toContain('background: none')
  })

  it('gives the current segment the same full accent as a done one', () => {
    // The point of the change: the two loud states stop differing by how much
    // ink is in the same colour, which is what distance takes away first.
    expect(rule('.entry-seg.current {')).toContain('background: var(--accent-grad)')
    expect(rule('.entry-seg.current {')).not.toContain('--bg-accent')
  })

  it('leaves the stripes off a segment that is both current and done', () => {
    // Finished is not under way, and with both wearing the same colour that
    // absence is the whole difference between them.
    expect(css).toContain('.entry-seg.current:not(.done)::after')
    expect(css).not.toContain('.entry-seg.current::after')
  })
})
