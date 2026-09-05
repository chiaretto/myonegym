import { describe, expect, it } from 'vitest'
import { EXAMPLE_DAYS, EXAMPLE_GYM, EXAMPLE_WEIGHTS } from './exampleRoutine'
import { officialExercise } from './officialCatalog'

/**
 * The sample routine is a list of ids into the official catalog. A number that
 * stopped meaning anything is a day that quietly comes up short — nothing
 * throws, nothing logs, the user just gets five exercises where the routine
 * says six. This is the file that notices.
 */
describe('the example routine points at real exercises', () => {
  const allIds = EXAMPLE_DAYS.flatMap((d) => d.exerciseIds)

  it('resolves every exercise in every day', () => {
    for (const day of EXAMPLE_DAYS) {
      for (const id of day.exerciseIds) {
        expect(officialExercise(id), `${day.name} → ${id}`).toBeDefined()
      }
    }
  })

  it('resolves every exercise it seeds a weight for', () => {
    for (const w of EXAMPLE_WEIGHTS) {
      expect(officialExercise(w.exerciseId), String(w.exerciseId)).toBeDefined()
    }
  })

  it('puts no cardio in a training day', () => {
    // A day is a strength routine — the repository enforces it, and a sample
    // that broke the rule would be teaching the wrong shape.
    for (const id of allIds) expect(officialExercise(id)?.kind, String(id)).toBe('strength')
  })

  it('is four days, which is the whole point of it', () => {
    expect(EXAMPLE_DAYS).toHaveLength(4)
    expect(EXAMPLE_GYM.trim()).not.toBe('')
  })

  it('does not repeat an exercise across the routine', () => {
    // Not a rule of the app — a user may put one exercise in two days — but in
    // a sample it would read as a mistake rather than as a choice.
    expect(new Set(allIds).size).toBe(allIds.length)
  })

  it('gives each day enough to look like a real one', () => {
    for (const day of EXAMPLE_DAYS) {
      expect(day.exerciseIds.length, day.name).toBeGreaterThanOrEqual(4)
      expect(day.name.trim(), day.name).not.toBe('')
    }
  })

  it('leaves some weights unset, which is what shows they are the user’s to set', () => {
    expect(EXAMPLE_WEIGHTS.length).toBeGreaterThan(0)
    expect(EXAMPLE_WEIGHTS.length).toBeLessThan(allIds.length)
    for (const w of EXAMPLE_WEIGHTS) expect(w.value).toBeGreaterThan(0)
  })
})
