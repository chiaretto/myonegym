import { describe, expect, it } from 'vitest'
import type { Category, Exercise, Gym, Session, SessionEntry, Weight } from '../../../db/types'
import { buildShareCard, type ShareVariant } from './shareModel'

const STARTED = new Date(2026, 6, 16, 8, 0).getTime()
const COMPLETED = STARTED + 48 * 60_000

const gym: Gym = { id: 1, name: 'Academia A', createdAt: 0 }

const session: Session = {
  id: 10,
  gymId: 1,
  dayName: 'Dia 1',
  startedAt: STARTED,
  completedAt: COMPLETED,
  status: 'completed',
}

const catMap = new Map<number, Category>([
  [1, { id: 1, name: 'Bíceps' }],
  [2, { id: 2, name: 'Peito' }],
])

const exMap = new Map<number, Exercise>([
  [1, { id: 1, name: 'Rosca Direta', categoryId: 1, mediaUrl: 'https://x.com/a.gif' }],
  [2, { id: 2, name: 'Supino', categoryId: 2 }],
])

const weights = new Map<number, Weight>([
  [1, { gymId: 1, exerciseId: 1, value: 22.5, unit: 'KG' }],
  [2, { gymId: 1, exerciseId: 2, value: 40, unit: 'KG' }],
])

const entries: SessionEntry[] = [
  { id: 1, sessionId: 10, exerciseId: 1, exerciseName: 'Rosca Direta', done: true },
  { id: 2, sessionId: 10, exerciseId: 2, exerciseName: 'Supino', done: false },
]

const build = (variant: ShareVariant, over: Partial<Parameters<typeof buildShareCard>[0]> = {}) =>
  buildShareCard({ session, entries, gym, weights, exMap, catMap, variant, ...over })

describe('buildShareCard', () => {
  it('shares the day, gym, date and done count in both variants', () => {
    for (const variant of ['full', 'lite'] as const) {
      const card = build(variant)
      expect(card.title).toBe('Dia 1')
      expect(card.gymName).toBe('Academia A')
      expect(card.dateLabel).toBe('16 jul 2026')
      expect(card.doneLabel).toBe('1 de 2 concluídos')
      expect(card.rows.map((r) => r.name)).toEqual(['Rosca Direta', 'Supino'])
      expect(card.rows.map((r) => r.category)).toEqual(['Bíceps', 'Peito'])
      expect(card.rows.map((r) => r.done)).toEqual([true, false])
      expect(card.rows[0].mediaUrl).toBe('https://x.com/a.gif')
    }
  })

  it('includes weights and duration on the detailed variant', () => {
    const card = build('full')
    expect(card.rows.map((r) => r.weight)).toEqual(['22,5 KG', '40 KG'])
    expect(card.durationLabel).toBe('48 min')
  })

  it('omits weights AND duration on the simplified variant', () => {
    const card = build('lite')
    expect(card.rows.map((r) => r.weight)).toEqual([undefined, undefined])
    expect(card.durationLabel).toBeUndefined()
  })

  it('uses an absolute date, not a relative label', () => {
    // Built "today" — a relative label would say "Hoje" and rot inside the image.
    const today = Date.now()
    const card = build('full', {
      session: { ...session, startedAt: today - 60_000, completedAt: today },
    })
    expect(card.dateLabel).not.toMatch(/hoje/i)
    expect(card.dateLabel).toMatch(/\d{4}$/)
  })

  it('reads the live target weight rather than a frozen one', () => {
    const card = build('full', {
      weights: new Map([[1, { gymId: 1, exerciseId: 1, value: 25, unit: 'KG' }]]),
    })
    expect(card.rows[0].weight).toBe('25 KG')
  })

  it('draws no weight badge for an entry with no target', () => {
    const card = build('full', { weights: new Map() })
    expect(card.rows.every((r) => r.weight === undefined)).toBe(true)
  })

  it('falls back to the entry snapshot when the source exercise was deleted', () => {
    const card = build('full', {
      entries: [{ id: 3, sessionId: 10, exerciseName: 'Rosca Direta', done: true }],
    })
    expect(card.rows[0]).toMatchObject({ name: 'Rosca Direta', done: true })
    expect(card.rows[0].category).toBeUndefined()
    expect(card.rows[0].mediaUrl).toBeUndefined()
    expect(card.rows[0].weight).toBeUndefined()
  })

  it('omits the gym name when the gym is gone', () => {
    expect(build('full', { gym: undefined }).gymName).toBeUndefined()
  })
})
