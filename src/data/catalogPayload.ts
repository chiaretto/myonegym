import type { MyOneGymDB } from '../db/db'
import { db } from '../db/db'
import type { CatalogSnapshot } from './catalogContract'
import { officialCategories, officialExercises } from './officialCatalog'

/**
 * Reading the catalog in the shape the assistant is given.
 *
 * The shape itself — types, section list, tool schema — lives in
 * `catalogContract.ts`, which imports nothing. This module is the half that
 * needs the database; everything is re-exported here so call sites have a
 * single import.
 */
export * from './catalogContract'

/** Read the current catalog in the shape the assistant is given. */
export async function catalogSnapshot(d: MyOneGymDB = db): Promise<CatalogSnapshot> {
  const [categories, exercises, days] = await Promise.all([
    d.categories.orderBy('name').toArray(),
    d.exercises.orderBy('name').toArray(),
    d.days.toArray(),
  ])
  const asCategory = (c: { id?: number; name: string }, readOnly?: true) => ({
    id: c.id!,
    name: c.name,
    ...(readOnly ? { readOnly } : {}),
  })
  const asExercise = (
    e: { id?: number; name: string; mediaUrl?: string; categoryIds: number[]; alternativeIds?: number[] },
    readOnly?: true,
  ) => ({
    id: e.id!,
    name: e.name,
    // `null` rather than an absent key: the assistant is being asked to fill
    // these in, and an explicit null is a far clearer "this one has none".
    mediaUrl: e.mediaUrl ?? null,
    categoryIds: e.categoryIds,
    alternativeIds: e.alternativeIds ?? [],
    ...(readOnly ? { readOnly } : {}),
  })
  return {
    categories: [
      ...officialCategories().map((c) => asCategory(c, true)),
      ...categories.map((c) => asCategory(c)),
    ],
    exercises: [
      ...officialExercises().map((e) => asExercise(e, true)),
      ...exercises.map((e) => asExercise(e)),
    ],
    days: days.map((day) => ({ id: day.id!, name: day.name, exerciseIds: day.exerciseIds })),
  }
}
