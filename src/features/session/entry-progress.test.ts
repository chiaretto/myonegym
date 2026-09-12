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
 * What is checked here is a **relationship between declarations**, and getting it
 * wrong is invisible in every way a person would normally look: the stripes still
 * show, a still frame still looks right, and the only symptom is a twitch at the
 * end of each loop. So the numbers are read out of the stylesheet and compared.
 * Crude, and the same trade `state/splashes.test.ts` already makes: when one fact
 * is spread across places, something has to hold them to each other.
 */
const css = readFileSync(resolve(__dirname, 'session.css'), 'utf8')

/** The block a selector opens, up to its closing brace. */
function rule(selector: string): string {
  const at = css.indexOf(selector)
  expect(at, `sem regra para ${selector}`).toBeGreaterThan(-1)
  return css.slice(at, css.indexOf('}', at))
}

const stripes = rule('.entry-seg.current:not(.done)::after')

describe('the current segment’s stripes', () => {
  /**
   * The horizontal repeat is the period divided by the sine of the angle.
   *
   * A gradient's period is measured **perpendicular to its bands**, so a slanted
   * pattern repeats over a longer distance sideways than it does across itself.
   * Sliding by the bare period would leave the stripes short of a full repeat and
   * make them jump every loop — the one mistake here that no screenshot shows.
   */
  it('slides by the pattern’s horizontal repeat, which the slant makes longer', () => {
    const gradient =
      /repeating-linear-gradient\((\d+)deg,[\s\S]*? 0 (\d+)px,\s*transparent \2px (\d+)px\)/.exec(
        stripes,
      )
    expect(gradient, 'o gradiente mudou de forma').not.toBeNull()
    const [angle, , period] = gradient!.slice(1).map(Number)

    const shift = /--stripe-shift:\s*calc\((\d+)px \* ([\d.]+)\)/.exec(stripes)
    expect(shift, '--stripe-shift mudou de forma').not.toBeNull()
    const declared = Number(shift![1]) * Number(shift![2])

    expect(Number(shift![1]), 'o fator multiplica o período, não outro número').toBe(period)
    const needed = period / Math.sin((angle * Math.PI) / 180)
    expect(declared).toBeCloseTo(needed, 3)
  })

  it('keeps the geometry and the travel on the same number', () => {
    // Offset by one horizontal repeat and that much wider: at the start of the
    // cycle the left edge is covered, at the end the right edge is. All three
    // read the same custom property, so they cannot drift apart — which is what
    // made a diagonal safe to introduce at all.
    expect(stripes).toContain('left: calc(-1 * var(--stripe-shift))')
    expect(stripes).toContain('width: calc(100% + var(--stripe-shift))')
    expect(rule('@keyframes entry-seg-stripes')).toContain('translateX(var(--stripe-shift))')
  })

  it('leans the bands rather than standing them upright', () => {
    // 90deg would be vertical bars; the slant is what reads as movement even in
    // a still frame.
    const angle = Number(/repeating-linear-gradient\((\d+)deg/.exec(stripes)![1])
    expect(angle % 90).not.toBe(0)
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

  it('draws the stripes in the colour of a pending segment', () => {
    // So they read as the empty track showing through the fill, rather than as a
    // pattern printed over it.
    expect(stripes).toContain('var(--surface-3)')
    expect(rule('.entry-seg {')).toContain('background: var(--surface-3)')
  })

  it('leaves the stripes off a segment that is both current and done', () => {
    // Finished is not under way, and with both wearing the same colour that
    // absence is the whole difference between them.
    expect(css).toContain('.entry-seg.current:not(.done)::after')
    expect(css).not.toContain('.entry-seg.current::after')
  })
})
