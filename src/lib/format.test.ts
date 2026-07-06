import { describe, expect, it } from 'vitest'
import { fmtNumber, historyDelta, relativeDate } from './format'
import type { WeightHistory } from '../db/types'

const h = (over: Partial<WeightHistory>): WeightHistory => ({
  gymId: 1,
  exerciseId: 1,
  value: 20,
  unit: 'KG',
  changedAt: 0,
  kind: 'value',
  ...over,
})

describe('fmtNumber', () => {
  it('uses comma decimals and trims zeros', () => {
    expect(fmtNumber(22.5)).toBe('22,5')
    expect(fmtNumber(40)).toBe('40')
  })
})

describe('relativeDate', () => {
  const now = 1_000 * 86_400_000
  it('labels today and weeks', () => {
    expect(relativeDate(now, now)).toBe('Hoje')
    expect(relativeDate(now - 15 * 86_400_000, now)).toBe('Há 2 semanas')
  })
})

describe('historyDelta', () => {
  it('first entry has no delta', () => {
    expect(historyDelta(h({ kind: 'first' }), undefined).direction).toBe('first')
  })
  it('increase and decrease', () => {
    expect(historyDelta(h({ value: 22.5 }), h({ value: 20 })).text).toBe('+2,5 KG')
    expect(historyDelta(h({ value: 20 }), h({ value: 22.5 })).direction).toBe('down')
  })
  it('unit change shows the new unit', () => {
    expect(historyDelta(h({ kind: 'unit', unit: 'LB' }), h({ unit: 'KG' })).text).toBe('→ LB')
  })
})
