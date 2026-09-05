/**
 * Types for `exerciseMedia.mjs`.
 *
 * The module is plain JavaScript because `npm run exercise-media` is run by
 * `node` directly, which cannot load TypeScript. This file is what lets the Vite
 * config and the admin plugin — both type-checked — import it.
 */

export interface CatalogExercise {
  id: number
  name: string
  kind?: 'strength' | 'cardio'
  categoryIds?: number[]
  alternativeIds?: number[]
  videos?: { url: string; title?: string; startSec?: number; endSec?: number }[]
  mediaFile?: string
}

export interface CatalogCategory {
  id: number
  name: string
}

export interface Catalog {
  app: string
  kind: string
  version: number
  exportedAt: number
  categories: CatalogCategory[]
  exercises: CatalogExercise[]
  /** Ids spent by a deleted category. See `retiredExerciseIds`. */
  retiredCategoryIds?: number[]
  /**
   * Ids spent by a deleted exercise, so none is ever handed out twice.
   *
   * An id ties the weight somebody already recorded to the movement they did.
   * Deleting the record removes the only trace that its number was used, and
   * the next new exercise would inherit a stranger's history — so the number is
   * written down here instead. Id 10 has been vacant since the file was
   * exported; this is what keeps it that way.
   */
  retiredExerciseIds?: number[]
}

export const CATALOG: string
export const MASTERS: string
export const OUT: string
export const MAX_WIDTH: number
export const DOWNLOAD_TIMEOUT_MS: number
export const SOURCES: string

export function slug(name: string): string
export function slugsByExercise(exercises: { id: number; name: string }[]): Map<number, string>
export function extensionFor(url: string): string
export function masterFor(base: string): string | undefined
export function convertMaster(master: string, base: string): Promise<string>
export function downloadMaster(url: string, base: string): Promise<string>
export function removeMedia(base: string): void
export function renameMedia(from: string, to: string): void
export function copyMedia(from: string, to: string): string | undefined
export function readSources(): Record<string, string>
export function writeSources(sources: Record<string, string>): void
export function readCatalog(): Catalog
export function writeCatalog(catalog: Catalog): void
export function sweepServed(catalog: Catalog): string[]
export function servedStamps(catalog: Catalog): Record<string, number>
