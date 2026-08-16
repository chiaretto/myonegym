import { describe, expect, it } from 'vitest'
import type { Exercise, Warmup } from '../db/types'
import { warmupsOf } from './warmups'

const w = (id: number, name: string): Warmup => ({ id, name, url: `https://x.com/${id}.png` })
const ex = (warmupIds: number[]): Exercise => ({
  id: 1,
  name: 'Supino',
  kind: 'strength',
  categoryIds: [],
  alternativeIds: [],
  warmupIds,
})

const map = new Map<number, Warmup>([
  [10, w(10, 'A')],
  [11, w(11, 'B')],
  [12, w(12, 'C')],
])

describe('warmupsOf', () => {
  it('resolves in the exercise list order, not the map order', () => {
    expect(warmupsOf(ex([12, 10]), map).map((x) => x.name)).toEqual(['C', 'A'])
  })

  it('is empty for an exercise with no links', () => {
    expect(warmupsOf(ex([]), map)).toEqual([])
  })

  it('is empty for no exercise at all', () => {
    expect(warmupsOf(undefined, map)).toEqual([])
  })

  it('drops ids with no record instead of leaving a hole', () => {
    // A gap in the pager reads as a broken app; a shorter pager does not.
    expect(warmupsOf(ex([10, 999, 11]), map).map((x) => x.name)).toEqual(['A', 'B'])
  })
})
