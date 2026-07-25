import { describe, expect, it } from 'vitest'
import { muscleAvatarClass } from './muscleAvatar'

describe('muscleAvatarClass', () => {
  it('matches the obvious groups', () => {
    expect(muscleAvatarClass(['Peito'])).toBe('pi-chest')
    expect(muscleAvatarClass(['Costas'])).toBe('pi-back')
    expect(muscleAvatarClass(['Ombros'])).toBe('pi-shoulders')
    expect(muscleAvatarClass(['Core'])).toBe('pi-core')
    expect(muscleAvatarClass(['Pernas'])).toBe('pi-legs')
  })

  it('ignores accents and case', () => {
    expect(muscleAvatarClass(['QUADRÍCEPS'])).toBe('pi-legs')
    expect(muscleAvatarClass(['Abdômen'])).toBe('pi-core')
    expect(muscleAvatarClass(['Glúteo'])).toBe('pi-legs')
    expect(muscleAvatarClass(['Trapézio'])).toBe('pi-back')
  })

  it('matches inside a longer name', () => {
    expect(muscleAvatarClass(['Posterior de coxa'])).toBe('pi-legs')
    expect(muscleAvatarClass(['Peitoral maior'])).toBe('pi-chest')
  })

  it('reads "Ombros e Trapézio" as shoulders, not back', () => {
    // Caught by running the seeded sample: "trapezio" is a back keyword, so with
    // back ranked first this day drew the back illustration.
    expect(muscleAvatarClass(['Ombros', 'Trapézio'])).toBe('pi-shoulders')
    // A genuinely-back day is unaffected — shoulders has no keyword for it.
    expect(muscleAvatarClass(['Costas', 'Trapézio'])).toBe('pi-back')
    expect(muscleAvatarClass(['Trapézio'])).toBe('pi-back')
  })

  it('is order-driven, not first-listed-wins', () => {
    // "Peito · Tríceps" must read as chest — chest outranks the arm categories,
    // which have no illustration of their own.
    expect(muscleAvatarClass(['Peito', 'Tríceps'])).toBe('pi-chest')
    // Costas outranks legs regardless of the order the day lists them.
    expect(muscleAvatarClass(['Quadríceps', 'Costas'])).toBe('pi-back')
    expect(muscleAvatarClass(['Costas', 'Quadríceps'])).toBe('pi-back')
  })

  it('falls back to the dumbbell rather than rendering nothing', () => {
    expect(muscleAvatarClass([])).toBe('pi-dumbbell')
    expect(muscleAvatarClass(['Superiores'])).toBe('pi-dumbbell')
    expect(muscleAvatarClass(['Tríceps'])).toBe('pi-dumbbell')
    expect(muscleAvatarClass(['Cardio', 'Mobilidade'])).toBe('pi-dumbbell')
  })

  it('survives junk input', () => {
    expect(muscleAvatarClass([''])).toBe('pi-dumbbell')
    expect(muscleAvatarClass(['   '])).toBe('pi-dumbbell')
    expect(muscleAvatarClass(['123', '???'])).toBe('pi-dumbbell')
  })
})
