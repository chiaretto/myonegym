import { describe, expect, it } from 'vitest'
import type { Exercise } from '../db/types'
import { visibleCardio } from './cardioVisibility'

const cardio = (id: number, name: string): Exercise => ({
  id,
  name,
  kind: 'cardio',
  categoryIds: [],
  alternativeIds: [],
  videos: [],
})

const LIST = [cardio(1, 'Bicicleta'), cardio(2, 'Esteira'), cardio(3, 'Natação')]
const names = (list: Exercise[]) => list.map((e) => e.name)

describe('visibleCardio', () => {
  it('shows everything when nothing is hidden', () => {
    const { visible, hiddenCount } = visibleCardio(LIST, new Set())
    expect(names(visible)).toEqual(['Bicicleta', 'Esteira', 'Natação'])
    expect(hiddenCount).toBe(0)
  })

  it('drops the hidden ones and keeps the order', () => {
    const { visible, hiddenCount } = visibleCardio(LIST, new Set([2]))
    expect(names(visible)).toEqual(['Bicicleta', 'Natação'])
    expect(hiddenCount).toBe(1)
  })

  it('can hide all of them', () => {
    const { visible, hiddenCount } = visibleCardio(LIST, new Set([1, 2, 3]))
    expect(visible).toEqual([])
    expect(hiddenCount).toBe(3)
  })

  it('keeps the running exercise visible, and still counts it as hidden', () => {
    const { visible, hiddenCount } = visibleCardio(LIST, new Set([2, 3]), 3)
    expect(names(visible)).toEqual(['Bicicleta', 'Natação'])
    expect(hiddenCount).toBe(2)
  })

  it('ignores a mark whose exercise is not in the cardio list any more', () => {
    const { visible, hiddenCount } = visibleCardio(LIST, new Set([3, 42]))
    expect(names(visible)).toEqual(['Bicicleta', 'Esteira'])
    expect(hiddenCount).toBe(1)
  })
})
