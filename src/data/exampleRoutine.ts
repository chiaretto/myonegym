import type { Unit } from '../db/types'

/**
 * The sample routine offered on first launch and from Configurações → Backup.
 *
 * It **references** the official catalog instead of creating a catalog of its
 * own. Before that catalog existed the sample had to bring its own 8 categories
 * and 29 exercises, and once the app started shipping them it was creating a
 * second "Supino Reto" beside the one already on screen — a starting point that
 * begins by duplicating the app.
 *
 * So what the sample actually is now is the only part it ever really was: **a
 * routine**. Four days, a gym, and a few weights so Home does not open as a
 * column of "definir".
 *
 * TypeScript rather than JSON on purpose: these are ids into the official
 * catalog, and `exampleRoutine.test.ts` resolves every one of them. A number
 * that stopped meaning anything is a day that quietly loses an exercise, and
 * that is exactly the failure a data file cannot notice.
 */

/** Four days, because that is the split most people actually keep: upper split
 *  over two days, legs, and shoulders with core. Six exercises each — enough to
 *  look like a real day, short enough to finish. */
export interface ExampleDay {
  name: string
  /** Ids in the official catalog, in the order they are done. */
  exerciseIds: number[]
}

export const EXAMPLE_GYM = 'Minha academia'

export const EXAMPLE_DAYS: ExampleDay[] = [
  {
    name: 'Dia 1 - Peito e Tríceps',
    // Supino reto, supino inclinado, crucifixo, tríceps pulley, tríceps testa,
    // mergulho.
    exerciseIds: [1, 2, 3, 4, 5, 6],
  },
  {
    name: 'Dia 2 - Costas e Bíceps',
    // Puxada frontal, remada curvada, remada sentada, puxada com triângulo,
    // rosca direta, rosca martelo.
    exerciseIds: [23, 12, 25, 24, 14, 15],
  },
  {
    name: 'Dia 3 - Pernas',
    // Hack, leg press, extensora, flexora, stiff, panturrilha em pé.
    exerciseIds: [28, 29, 33, 30, 36, 35],
  },
  {
    name: 'Dia 4 - Ombros e Core',
    // Desenvolvimento, elevação lateral, elevação frontal, voador inverso,
    // prancha, abdominal oblíquo.
    exerciseIds: [18, 19, 20, 27, 7, 9],
  },
]

/**
 * A starting load for some of them — the ones where a number is obvious enough
 * to be useful and vague enough not to be advice. Deliberately partial: the
 * blanks are what show the user that a weight is theirs to set.
 *
 * Seeded **global** (see `GLOBAL_GYM_ID`): a weight belongs to the exercise, not
 * to the example gym, so a second gym created later already has them.
 */
export const EXAMPLE_WEIGHTS: { exerciseId: number; value: number; unit: Unit }[] = [
  { exerciseId: 1, value: 40, unit: 'KG' }, // Supino Reto com Barra
  { exerciseId: 2, value: 30, unit: 'KG' }, // Supino Inclinado com Barra
  { exerciseId: 4, value: 25, unit: 'KG' }, // Tríceps Pulley
  { exerciseId: 12, value: 30, unit: 'KG' }, // Remada Curvada
  { exerciseId: 14, value: 20, unit: 'KG' }, // Rosca Direta
  { exerciseId: 29, value: 80, unit: 'KG' }, // Leg press 45°
  { exerciseId: 33, value: 35, unit: 'KG' }, // Cadeira Extensora
  { exerciseId: 19, value: 8, unit: 'KG' }, // Elevação Lateral
]
