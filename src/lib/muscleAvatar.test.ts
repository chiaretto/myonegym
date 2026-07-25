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
