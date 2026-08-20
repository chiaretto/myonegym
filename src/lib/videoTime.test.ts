import { describe, expect, it } from 'vitest'
import { formatClock, formatRange, parseClock } from './videoTime'

describe('parseClock', () => {
  it('reads m:ss and h:mm:ss', () => {
    expect(parseClock('2:10')).toBe(130)
    expect(parseClock('0:05')).toBe(5)
    expect(parseClock('1:05:30')).toBe(3930)
  })

  it('reads a bare number as seconds', () => {
    expect(parseClock('90')).toBe(90)
    expect(parseClock('7')).toBe(7)
  })

  it('trims', () => {
    expect(parseClock('  2:10  ')).toBe(130)
  })

  it('is null for empty', () => {
    expect(parseClock('')).toBeNull()
    expect(parseClock('   ')).toBeNull()
  })

  it('rejects a minute part over 59 — "1:90" is not a time anyone means', () => {
    // Accepting it would silently become 2:30, which is not what was typed.
    expect(parseClock('1:90')).toBeNull()
  })

  it('rejects nonsense', () => {
    expect(parseClock('abc')).toBeNull()
    expect(parseClock('2:1o')).toBeNull()
    expect(parseClock('1:2:3:4')).toBeNull()
    expect(parseClock('-5')).toBeNull()
  })
})

describe('formatClock', () => {
  it('pads to m:ss', () => {
    expect(formatClock(130)).toBe('2:10')
    expect(formatClock(5)).toBe('0:05')
    expect(formatClock(0)).toBe('0:00')
  })

  it('grows to h:mm:ss past an hour', () => {
    expect(formatClock(3930)).toBe('1:05:30')
  })

  it('round-trips with parseClock', () => {
    for (const s of [0, 5, 59, 60, 130, 3599, 3930]) {
      expect(parseClock(formatClock(s))).toBe(s)
    }
  })
})

describe('formatRange', () => {
  it('shows both ends', () => {
    expect(formatRange({ startSec: 130, endSec: 165 })).toBe('2:10–2:45')
  })

  it('says what a single end means', () => {
    expect(formatRange({ startSec: 90 })).toBe('a partir de 1:30')
    expect(formatRange({ endSec: 90 })).toBe('até 1:30')
  })

  it('is null when there is no range', () => {
    expect(formatRange({})).toBeNull()
  })
})
