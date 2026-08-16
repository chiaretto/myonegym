import { describe, expect, it } from 'vitest'
import { fmtClock, fmtNumber, historyDelta, relativeDate } from './format'
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

describe('fmtClock', () => {
  it('pads every field to two digits', () => {
    expect(fmtClock(0)).toBe('00:00:00')
    expect(fmtClock(754_000)).toBe('00:12:34')
    expect(fmtClock(3_847_000)).toBe('01:04:07')
  })

  it('truncates the seconds instead of rounding them', () => {
    // 0.9 s in has not been a second yet, so the clock must not claim one.
    expect(fmtClock(900)).toBe('00:00:00')
    expect(fmtClock(59_999)).toBe('00:00:59')
  })

  it('lets the hours grow past a day rather than wrapping', () => {
    expect(fmtClock(26 * 3_600_000)).toBe('26:00:00')
  })

  it('clamps a negative span to zero', () => {
    expect(fmtClock(-5_000)).toBe('00:00:00')
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
