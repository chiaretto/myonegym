import { describe, expect, it } from 'vitest'
import { alternativesOf } from './alternatives'
import type { Exercise } from '../db/types'

const ex = (id: number, name: string, alts: number[] = []): Exercise => ({
  id,
  name,
  categoryIds: [],
  alternativeIds: alts,
})

const catalog = (...list: Exercise[]) => new Map(list.map((e) => [e.id!, e]))

describe('alternativesOf', () => {
  it('resolves the declared alternatives, in order', () => {
    const map = catalog(
      ex(1, 'Supino Reto', [2, 3]),
      ex(2, 'Supino Máquina', [1]),
      ex(3, 'Crucifixo', [1]),
    )
    expect(alternativesOf(map.get(1), map).map((e) => e.name)).toEqual([
      'Supino Máquina',
      'Crucifixo',
    ])
  })

  it('does not make the two alternatives alternatives of each other', () => {
    const map = catalog(
      ex(1, 'Supino Reto', [2, 3]),
      ex(2, 'Supino Máquina', [1]),
      ex(3, 'Crucifixo', [1]),
    )
    expect(alternativesOf(map.get(2), map).map((e) => e.name)).toEqual(['Supino Reto'])
  })

  it('drops a peer that no longer exists', () => {
    // A stale id can survive in a hand-edited backup; a view must not render a
    // row for something it cannot name.
    const map = catalog(ex(1, 'Supino Reto', [2, 99]), ex(2, 'Supino Máquina', [1]))
    expect(alternativesOf(map.get(1), map).map((e) => e.name)).toEqual(['Supino Máquina'])
  })

  it('is empty for an exercise with no alternatives', () => {
    const map = catalog(ex(1, 'Rosca Direta'))
    expect(alternativesOf(map.get(1), map)).toEqual([])
  })

  it('is empty for a missing exercise', () => {
    expect(alternativesOf(undefined, catalog())).toEqual([])
  })

  it('tolerates a record written before the field existed', () => {
    const legacy = { id: 1, name: 'Legado', categoryIds: [] } as unknown as Exercise
    expect(() => alternativesOf(legacy, catalog(legacy))).not.toThrow()
    expect(alternativesOf(legacy, catalog(legacy))).toEqual([])
  })
})
