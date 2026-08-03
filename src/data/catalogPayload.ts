import type { MyOneGymDB } from '../db/db'
import { db } from '../db/db'
import type { CatalogSnapshot } from './catalogContract'

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
  return {
    categories: categories.map((c) => ({ id: c.id!, name: c.name })),
    exercises: exercises.map((e) => ({
      id: e.id!,
      name: e.name,
      // `null` rather than an absent key: the assistant is being asked to fill
      // these in, and an explicit null is a far clearer "this one has none".
      mediaUrl: e.mediaUrl ?? null,
      categoryIds: e.categoryIds,
      alternativeIds: e.alternativeIds ?? [],
    })),
    days: days.map((day) => ({ id: day.id!, name: day.name, exerciseIds: day.exerciseIds })),
  }
}
