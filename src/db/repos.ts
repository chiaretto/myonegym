import { readImage, removeImage, sweepOrphans, writeImage } from '../data/photoStore'
import { db, type MyOneGymDB } from './db'
import {
  type Category,
  type Day,
  type Exercise,
  type ExerciseNote,
  type ExercisePhoto,
  type Gym,
  type Session,
  type SessionEntry,
  type Unit,
  type Weight,
  type WeightHistory,
} from './types'

/** Thrown for user-facing validation failures (empty/duplicate names, etc.). */
export class ValidationError extends Error {}

function requireName(name: string, what = 'nome'): string {
  const trimmed = name.trim()
  if (!trimmed) throw new ValidationError(`Informe um ${what}.`)
  return trimmed
}

/**
 * True when the device has any registered data at all (gyms, categories,
 * exercises, or days). Used to decide whether a device is "already asked"
 * for the first-launch sample-data prompt.
 */
export async function hasAnyRegisteredData(d: MyOneGymDB = db): Promise<boolean> {
  const [gyms, categories, exercises, days] = await Promise.all([
    d.gyms.count(),
    d.categories.count(),
    d.exercises.count(),
    d.days.count(),
  ])
  return gyms + categories + exercises + days > 0
}

/* ------------------------------------------------------------------ gyms */

export async function listGyms(d: MyOneGymDB = db): Promise<Gym[]> {
  return d.gyms.orderBy('createdAt').toArray()
}

/**
 * Create a gym. When `copyFromGymId` is given, duplicates that gym's CURRENT
 * weights into independent rows for the new gym (history is NOT copied).
 * Returns the new gym id.
 */
export async function createGym(
  name: string,
  copyFromGymId?: number,
  d: MyOneGymDB = db,
): Promise<number> {
  const clean = requireName(name, 'nome da academia')
  return d.transaction('rw', d.gyms, d.weights, async () => {
    const gymId = await d.gyms.add({ name: clean, createdAt: Date.now() })
    if (copyFromGymId != null) {
      const source = await d.weights.where('gymId').equals(copyFromGymId).toArray()
      if (source.length) {
        await d.weights.bulkAdd(
          source.map((w) => ({
            gymId,
            exerciseId: w.exerciseId,
            value: w.value,
            unit: w.unit,
          })),
        )
      }
    }
    return gymId
  })
}

export async function renameGym(id: number, name: string, d: MyOneGymDB = db): Promise<void> {
  await d.gyms.update(id, { name: requireName(name, 'nome da academia') })
}

/** Delete a gym and cascade to its weights, history, exercise notes and photos. */
export async function deleteGym(id: number, d: MyOneGymDB = db): Promise<void> {
  // Note the file names before the records go: after the transaction there is
  // nothing left to say which images belonged to this gym.
  const files = await photoFilesWhere('gymId', id, d)
  await d.transaction(
    'rw',
    d.gyms,
    d.weights,
    d.weightHistory,
    d.exerciseNotes,
    d.exercisePhotos,
    async () => {
      await d.weights.where('gymId').equals(id).delete()
      await d.weightHistory.where('gymId').equals(id).delete()
      await d.exerciseNotes.where('gymId').equals(id).delete()
      await d.exercisePhotos.where('gymId').equals(id).delete()
      await d.gyms.delete(id)
    },
  )
  await removePhotoFiles(files)
}

/* ------------------------------------------------------------ categories */

export async function listCategories(d: MyOneGymDB = db): Promise<Category[]> {
  return d.categories.orderBy('name').toArray()
}

async function assertUniqueCategory(name: string, d: MyOneGymDB, exceptId?: number) {
  const clash = await d.categories.where('name').equalsIgnoreCase(name).first()
  if (clash && clash.id !== exceptId) {
    throw new ValidationError(`Já existe a categoria "${clash.name}".`)
  }
}

export async function createCategory(name: string, d: MyOneGymDB = db): Promise<number> {
  const clean = requireName(name, 'nome da categoria')
  return d.transaction('rw', d.categories, async () => {
    await assertUniqueCategory(clean, d)
    return d.categories.add({ name: clean })
  })
}

export async function renameCategory(id: number, name: string, d: MyOneGymDB = db): Promise<void> {
  const clean = requireName(name, 'nome da categoria')
  await d.transaction('rw', d.categories, async () => {
    await assertUniqueCategory(clean, d, id)
    await d.categories.update(id, { name: clean })
  })
}

/**
 * Delete a category. It is removed from every exercise's category list; an
 * exercise left with no categories becomes uncategorized (empty list, shown as
 * "Sem categoria"). Days reference exercises (not categories), so they need no
 * change. Any category may be deleted — there is no reserved bucket.
 */
export async function deleteCategory(id: number, d: MyOneGymDB = db): Promise<void> {
  await d.transaction('rw', d.categories, d.exercises, async () => {
    if (!(await d.categories.get(id))) return
    await d.exercises
      .where('categoryIds')
      .equals(id)
      .modify((e) => {
        e.categoryIds = e.categoryIds.filter((c) => c !== id)
      })
    await d.categories.delete(id)
  })
}

/* ------------------------------------------------------------- exercises */

export async function listExercises(d: MyOneGymDB = db): Promise<Exercise[]> {
  return d.exercises.orderBy('name').toArray()
}

const URL_RE = /^https?:\/\/.+/i
const MEDIA_RE = /\.(png|jpe?g|webp|gif)(\?.*)?$/i

/** Validate an optional media URL: must be http(s) and look like an image/GIF. */
export function validateMediaUrl(url: string | undefined): string | undefined {
  const clean = (url ?? '').trim()
  if (!clean) return undefined
  if (!URL_RE.test(clean)) throw new ValidationError('URL inválida (use http:// ou https://).')
  if (!MEDIA_RE.test(clean)) {
    throw new ValidationError('A URL deve apontar para uma imagem (PNG/JPG/WebP) ou GIF.')
  }
  return clean
}

export async function createExercise(
  input: { name: string; mediaUrl?: string; categoryIds?: number[]; alternativeIds?: number[] },
  d: MyOneGymDB = db,
): Promise<number> {
  const name = requireName(input.name, 'nome do exercício')
  const mediaUrl = validateMediaUrl(input.mediaUrl)
  return d.transaction('rw', d.exercises, async () => {
    const id = await d.exercises.add({
      name,
      mediaUrl,
      categoryIds: input.categoryIds ?? [],
      alternativeIds: [],
    })
    // Through setAlternatives, never by writing the field: the set has to stay
    // symmetric on the peers too.
    if (input.alternativeIds?.length) await setAlternatives(id, input.alternativeIds, d)
    return id
  })
}

export async function updateExercise(
  id: number,
  input: { name: string; mediaUrl?: string; categoryIds?: number[]; alternativeIds?: number[] },
  d: MyOneGymDB = db,
): Promise<void> {
  const name = requireName(input.name, 'nome do exercício')
  const mediaUrl = validateMediaUrl(input.mediaUrl)
  await d.transaction('rw', d.exercises, async () => {
    await d.exercises.update(id, { name, mediaUrl, categoryIds: input.categoryIds ?? [] })
    // `undefined` means "this caller isn't editing alternatives" — only an
    // explicit list (including `[]`, which clears the set) touches them.
    if (input.alternativeIds !== undefined) await setAlternatives(id, input.alternativeIds, d)
  })
}

/**
 * Declare which exercises `exerciseId` can be swapped for, keeping the relation
 * symmetric (see `Exercise.alternativeIds`).
 *
 * Each side is edited independently: `ids` becomes this exercise's own list,
 * and the only thing written on the others is a link back to this one. Picking
 * a peer that already has alternatives of its own does **not** absorb them —
 * that is what lets one exercise head several unrelated kinds of variation
 * (the bench press swaps for the machine *and* for the fly, which never become
 * alternatives of each other).
 *
 * This is the ONLY writer of the symmetry — every caller goes through here.
 */
export async function setAlternatives(
  exerciseId: number,
  ids: number[],
  d: MyOneGymDB = db,
): Promise<void> {
  await d.transaction('rw', d.exercises, async () => {
    const self = await d.exercises.get(exerciseId)
    if (!self) throw new ValidationError('Exercício não encontrado.')

    // A stale pick can't resurrect a deleted exercise, and nothing is its own
    // alternative.
    const next: number[] = []
    for (const id of ids) {
      if (id === exerciseId || next.includes(id)) continue
      if (await d.exercises.get(id)) next.push(id)
    }
    await d.exercises.update(exerciseId, { alternativeIds: next })

    // Mirror onto the peers: add the back-link where it's new, drop it where
    // the edit removed it. Only this exercise's own id is ever touched on
    // them, so their other alternatives are none of this edit's business.
    for (const id of next) {
      const peer = await d.exercises.get(id)
      const peers = peer?.alternativeIds ?? []
      if (!peers.includes(exerciseId)) {
        await d.exercises.update(id, { alternativeIds: [...peers, exerciseId] })
      }
    }
    for (const gone of self.alternativeIds ?? []) {
      if (next.includes(gone)) continue
      const peer = await d.exercises.get(gone)
      if (!peer) continue
      await d.exercises.update(gone, {
        alternativeIds: (peer.alternativeIds ?? []).filter((x) => x !== exerciseId),
      })
    }
  })
}

/**
 * Delete an exercise: pull it from all days, unlink it from its alternatives,
 * and drop its weights, history, per-gym notes, and per-gym photos.
 */
export async function deleteExercise(id: number, d: MyOneGymDB = db): Promise<void> {
  const files = await photoFilesWhere('exerciseId', id, d)
  // Array form: Dexie's typed overloads stop at 5 tables.
  await d.transaction(
    'rw',
    [d.exercises, d.days, d.weights, d.weightHistory, d.exerciseNotes, d.exercisePhotos],
    async () => {
      // Unlink first, while the record is still there to say who its peers are.
      // Because the relation is symmetric, its own list IS the list of referrers
      // — no scan needed. A pair left with one member ends up with `[]`, which
      // is exactly "no alternatives".
      const self = await d.exercises.get(id)
      for (const peerId of self?.alternativeIds ?? []) {
        const peer = await d.exercises.get(peerId)
        if (!peer) continue
        await d.exercises.update(peerId, {
          alternativeIds: (peer.alternativeIds ?? []).filter((x) => x !== id),
        })
      }
      await d.days
        .filter((day) => day.exerciseIds.includes(id))
        .modify((day) => {
          day.exerciseIds = day.exerciseIds.filter((x) => x !== id)
        })
      await d.weights.where('exerciseId').equals(id).delete()
      await d.weightHistory.where('exerciseId').equals(id).delete()
      await d.exerciseNotes.where('exerciseId').equals(id).delete()
      // Photos are the heaviest rows in the DB — orphans would waste storage the
      // user has no way to reach or clear.
      await d.exercisePhotos.where('exerciseId').equals(id).delete()
      await d.exercises.delete(id)
    },
  )
  await removePhotoFiles(files)
}

/* ------------------------------------------------------------------ days */

export async function listDays(d: MyOneGymDB = db): Promise<Day[]> {
  const days = await d.days.toArray()
  // User order when set; otherwise insertion order (by id). Explicit `order`
  // values (0..n-1, assigned on reorder) always sort before id-fallback days.
  return days.sort(
    (a, b) => (a.order ?? a.id ?? 0) - (b.order ?? b.id ?? 0) || (a.id ?? 0) - (b.id ?? 0),
  )
}

/** Persist the given day ids as the display order (order = index). */
export async function reorderDays(orderedIds: number[], d: MyOneGymDB = db): Promise<void> {
  await d.transaction('rw', d.days, async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await d.days.update(orderedIds[i], { order: i })
    }
  })
}

export async function createDay(
  input: { name: string; exerciseIds?: number[] },
  d: MyOneGymDB = db,
): Promise<number> {
  const name = requireName(input.name, 'nome do dia')
  return d.days.add({ name, exerciseIds: input.exerciseIds ?? [] })
}

export async function updateDay(
  id: number,
  input: { name: string; exerciseIds: number[] },
  d: MyOneGymDB = db,
): Promise<void> {
  const name = requireName(input.name, 'nome do dia')
  await d.days.update(id, { name, exerciseIds: input.exerciseIds })
}

export async function deleteDay(id: number, d: MyOneGymDB = db): Promise<void> {
  await d.days.delete(id)
}

/* --------------------------------------------------------------- weights */

export async function getWeight(
  gymId: number,
  exerciseId: number,
  d: MyOneGymDB = db,
): Promise<Weight | undefined> {
  return d.weights.where('[gymId+exerciseId]').equals([gymId, exerciseId]).first()
}

/** Current weights for a gym as a Map<exerciseId, Weight> (for Home badges). */
export async function weightsForGym(
  gymId: number,
  d: MyOneGymDB = db,
): Promise<Map<number, Weight>> {
  const rows = await d.weights.where('gymId').equals(gymId).toArray()
  return new Map(rows.map((w) => [w.exerciseId, w]))
}

/**
 * Persist a target weight for (gym, exercise) and append a history entry.
 * The entry kind: 'first' when there was no prior weight, 'unit' when only the
 * unit changed relative to the current record, otherwise 'value'.
 */
export async function saveWeight(
  gymId: number,
  exerciseId: number,
  value: number,
  unit: Unit,
  d: MyOneGymDB = db,
): Promise<void> {
  if (!Number.isFinite(value) || value < 0) {
    throw new ValidationError('Peso inválido.')
  }
  await d.transaction('rw', d.weights, d.weightHistory, async () => {
    const current = await d.weights
      .where('[gymId+exerciseId]')
      .equals([gymId, exerciseId])
      .first()
    const kind = !current ? 'first' : current.unit !== unit ? 'unit' : 'value'

    if (current?.id != null) {
      await d.weights.update(current.id, { value, unit })
    } else {
      await d.weights.add({ gymId, exerciseId, value, unit })
    }
    await d.weightHistory.add({ gymId, exerciseId, value, unit, changedAt: Date.now(), kind })
  })
}

/** History for (gym, exercise), newest first. */
export async function listHistory(
  gymId: number,
  exerciseId: number,
  d: MyOneGymDB = db,
): Promise<WeightHistory[]> {
  const rows = await d.weightHistory
    .where('[gymId+exerciseId]')
    .equals([gymId, exerciseId])
    .toArray()
  return rows.sort((a, b) => b.changedAt - a.changedAt || (b.id ?? 0) - (a.id ?? 0))
}

/**
 * Delete a history entry. Deleting the newest entry reverts the current weight
 * to the previous entry (or clears it if none remain). Non-newest deletions
 * leave the current weight untouched.
 */
export async function deleteHistoryEntry(entryId: number, d: MyOneGymDB = db): Promise<void> {
  await d.transaction('rw', d.weights, d.weightHistory, async () => {
    const entry = await d.weightHistory.get(entryId)
    if (!entry) return
    const { gymId, exerciseId } = entry
    const all = await d.weightHistory
      .where('[gymId+exerciseId]')
      .equals([gymId, exerciseId])
      .toArray()
    all.sort((a, b) => b.changedAt - a.changedAt || (b.id ?? 0) - (a.id ?? 0))
    const isNewest = all[0]?.id === entryId

    await d.weightHistory.delete(entryId)

    if (!isNewest) return

    const remaining = all.filter((e) => e.id !== entryId)
    const current = await d.weights
      .where('[gymId+exerciseId]')
      .equals([gymId, exerciseId])
      .first()
    if (remaining.length) {
      const prev = remaining[0]
      if (current?.id != null) {
        await d.weights.update(current.id, { value: prev.value, unit: prev.unit })
      } else {
        await d.weights.add({ gymId, exerciseId, value: prev.value, unit: prev.unit })
      }
    } else if (current?.id != null) {
      await d.weights.delete(current.id)
    }
  })
}

/* --------------------------------------------------------- exercise notes */

/** The note for (gym, exercise), if any (at most one). */
export async function getNote(
  gymId: number,
  exerciseId: number,
  d: MyOneGymDB = db,
): Promise<ExerciseNote | undefined> {
  return d.exerciseNotes.where('[gymId+exerciseId]').equals([gymId, exerciseId]).first()
}

/**
 * Upsert the note for (gym, exercise). Blank/whitespace-only text DELETES the
 * record (there is no "empty note"). Stamps `updatedAt` on save.
 */
export async function saveNote(
  gymId: number,
  exerciseId: number,
  text: string,
  d: MyOneGymDB = db,
): Promise<void> {
  const clean = text.trim()
  await d.transaction('rw', d.exerciseNotes, async () => {
    const current = await d.exerciseNotes
      .where('[gymId+exerciseId]')
      .equals([gymId, exerciseId])
      .first()
    if (!clean) {
      if (current?.id != null) await d.exerciseNotes.delete(current.id)
      return
    }
    if (current?.id != null) {
      await d.exerciseNotes.update(current.id, { text: clean, updatedAt: Date.now() })
    } else {
      await d.exerciseNotes.add({ gymId, exerciseId, text: clean, updatedAt: Date.now() })
    }
  })
}

/* -------------------------------------------------------- exercise photos */

/**
 * File names of the photos matching an indexed field, collected **before** the
 * records are deleted. A cascade has to know what to unlink from disk, and once
 * the rows are gone nothing can tell which files were theirs.
 */
async function photoFilesWhere(
  field: 'gymId' | 'exerciseId',
  value: number,
  d: MyOneGymDB,
): Promise<string[]> {
  const files: string[] = []
  await d.exercisePhotos
    .where(field)
    .equals(value)
    .each((p) => {
      if (p.file) files.push(p.file)
    })
  return files
}

/** Best-effort: a file left behind is garbage the orphan sweep collects. */
async function removePhotoFiles(files: string[]): Promise<void> {
  for (const file of files) await removeImage({ file })
}

/**
 * Photos for (gym, exercise), newest first. Many per pair (unlike notes).
 * Ties on `createdAt` break by id — two photos attached within the same
 * millisecond would otherwise come back in an unstable order.
 */
export async function listPhotos(
  gymId: number,
  exerciseId: number,
  d: MyOneGymDB = db,
): Promise<ExercisePhoto[]> {
  const rows = await d.exercisePhotos
    .where('[gymId+exerciseId]')
    .equals([gymId, exerciseId])
    .toArray()
  return rows.sort((a, b) => b.createdAt - a.createdAt || (b.id ?? 0) - (a.id ?? 0))
}

/** A photo's image as a Blob, wherever it is stored. Throws `PhotoImageError`
 *  when the image is gone (see data/photoStore). */
export async function readPhotoBlob(photo: ExercisePhoto): Promise<Blob> {
  return readImage(photo)
}

/**
 * Attach a photo to (gym, exercise). The image is expected to be **already
 * downscaled** (see downscalePhoto) — this layer stores what it is given.
 * Returns the new id.
 *
 * The image is written **before** the record, and removed again if the record
 * fails: no transaction spans a file and a table, so the order has to be the one
 * where a crash leaves collectable garbage instead of a photo pointing at
 * nothing.
 */
export async function addPhoto(
  gymId: number,
  exerciseId: number,
  image: Blob,
  width: number,
  height: number,
  d: MyOneGymDB = db,
): Promise<number> {
  const stored = await writeImage(image)
  try {
    return await d.exercisePhotos.add({
      gymId,
      exerciseId,
      file: stored.file,
      bytes: stored.bytes,
      type: image.type,
      width,
      height,
      size: stored.size,
      createdAt: Date.now(),
    })
  } catch (err) {
    await removeImage(stored)
    throw err
  }
}

/** Delete a photo, record first and image after (see `addPhoto` for the why). */
export async function deletePhoto(id: number, d: MyOneGymDB = db): Promise<void> {
  const photo = await d.exercisePhotos.get(id)
  await d.exercisePhotos.delete(id)
  if (photo) await removeImage(photo)
}

/**
 * Move photos still carrying their image in the record into file storage.
 *
 * Runs at launch, in the background: nobody is asked to migrate their own
 * photos, and nothing waits on it. Idempotent and per photo — an interruption
 * leaves every other photo untouched, and a photo that fails stays exactly as
 * it was, which is to say still readable. The bytes are moved, never
 * re-encoded. Returns how many moved.
 */
export async function migrateLegacyPhotos(d: MyOneGymDB = db): Promise<number> {
  const ids = await d.exercisePhotos.toCollection().primaryKeys()
  let moved = 0
  for (const id of ids) {
    const photo = await d.exercisePhotos.get(id)
    if (!photo?.bytes || photo.file) continue
    try {
      const stored = await writeImage(new Blob([photo.bytes], { type: photo.type }))
      // No OPFS on this device: leave the record as it is, it works.
      if (!stored.file) continue
      await d.exercisePhotos
        .where(':id')
        .equals(id)
        .modify((p) => {
          p.file = stored.file
          p.size = stored.size
          delete p.bytes
        })
      moved++
    } catch {
      // Quota, a failed write, anything: the record still holds the image, so
      // the photo keeps displaying and the next launch tries again.
    }
  }
  return moved
}

/** Delete every image file no record references. Returns how many went. */
export async function sweepPhotoOrphans(d: MyOneGymDB = db): Promise<number> {
  const keep = new Set<string>()
  await d.exercisePhotos.toCollection().each((p) => {
    if (p.file) keep.add(p.file)
  })
  return sweepOrphans(keep)
}

/**
 * Launch-time upkeep of the photo storage: migrate what predates it, then drop
 * files nothing points at. In this order — sweeping first would race the
 * migration's own writes.
 */
export async function maintainPhotoStorage(d: MyOneGymDB = db): Promise<void> {
  await migrateLegacyPhotos(d)
  await sweepPhotoOrphans(d)
}

/* ------------------------------------------------------------- sessions */

export interface SessionSummary {
  session: Session
  total: number
  done: number
  /**
   * Name of the gym the session was done at, resolved at read time — `Session`
   * stores only `gymId`.
   *
   * `null` means the gym no longer exists: deleting a gym does not delete its
   * sessions (see `deleteGym`), and those sessions are real workouts that must
   * stay visible. Resolving here rather than in each screen keeps that one case
   * handled in one place.
   *
   * Read-time lookup, not a snapshot like `Session.dayName`: snapshotting would
   * need a migration and would still leave every already-recorded session
   * nameless. The trade-off is that renaming a gym relabels its past sessions
   * too — acceptable for a "where was this" label.
   */
  gymName: string | null
}

/** The in-progress session for a gym, if any (at most one). */
export async function getActiveSession(
  gymId: number,
  d: MyOneGymDB = db,
): Promise<Session | undefined> {
  return d.sessions
    .where('gymId')
    .equals(gymId)
    .filter((s) => s.status === 'active')
    .first()
}

/**
 * Start a workout session for a day in the given gym. Creates one entry per
 * exercise, snapshotting only the exercise NAME (for durability). Entries store
 * no weight — the weight shown/edited is always the exercise's per-gym target.
 * Rejects if the gym already has an in-progress session (only one active session
 * per gym). Returns the new id.
 *
 * Alternatives do not appear here: only the exercise the user put in the day
 * does. Swapping to one of its alternatives happens mid-workout, in place.
 */
export async function startSession(
  gymId: number,
  dayId: number,
  d: MyOneGymDB = db,
): Promise<number> {
  return d.transaction('rw', d.sessions, d.sessionEntries, d.days, d.exercises, async () => {
    const active = await d.sessions
      .where('gymId')
      .equals(gymId)
      .filter((s) => s.status === 'active')
      .first()
    if (active) {
      throw new ValidationError('Já existe um treino em andamento nesta academia.')
    }
    const day = await d.days.get(dayId)
    if (!day) throw new ValidationError('Dia de treino não encontrado.')

    const sessionId = await d.sessions.add({
      gymId,
      dayId,
      dayName: day.name,
      startedAt: Date.now(),
      status: 'active',
    })
    for (const exId of day.exerciseIds) {
      const ex = await d.exercises.get(exId)
      if (!ex) continue
      await d.sessionEntries.add({
        sessionId,
        exerciseId: exId,
        exerciseName: ex.name,
        done: false,
      })
    }
    return sessionId
  })
}

export async function getSession(id: number, d: MyOneGymDB = db): Promise<Session | undefined> {
  return d.sessions.get(id)
}

export async function getSessionEntry(
  entryId: number,
  d: MyOneGymDB = db,
): Promise<SessionEntry | undefined> {
  return d.sessionEntries.get(entryId)
}

/** Entries of a session in insertion order (matches the day's exercise order). */
export async function listSessionEntries(
  sessionId: number,
  d: MyOneGymDB = db,
): Promise<SessionEntry[]> {
  const rows = await d.sessionEntries.where('sessionId').equals(sessionId).toArray()
  return rows.sort((a, b) => (a.id ?? 0) - (b.id ?? 0))
}

/** Completed sessions for a gym, newest first, with done/total counts. */
/**
 * Every completed session, across all gyms, newest first.
 *
 * Deliberately not scoped to a gym: the active gym decides where a workout
 * happens and which target weights apply, not what the user can see of their own
 * past. A person training at two gyms has one history.
 *
 * Sorting is chronological across gyms, not grouped by gym — `completedAt`
 * descending, with the id as a tiebreak so sessions finished in the same
 * millisecond keep a stable order.
 */
export async function listSessionSummaries(d: MyOneGymDB = db): Promise<SessionSummary[]> {
  const sessions = (await d.sessions.filter((s) => s.status === 'completed').toArray()).sort(
    (a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0) || (b.id ?? 0) - (a.id ?? 0),
  )

  // One read for the whole gym table, not one per session: the list is tiny and
  // the loop below already costs a query per session.
  const gymNames = new Map((await d.gyms.toArray()).map((g) => [g.id!, g.name]))

  const out: SessionSummary[] = []
  for (const session of sessions) {
    const entries = await d.sessionEntries.where('sessionId').equals(session.id!).toArray()
    out.push({
      session,
      total: entries.length,
      done: entries.filter((e) => e.done).length,
      gymName: gymNames.get(session.gymId) ?? null,
    })
  }
  return out
}

export async function setEntryDone(
  entryId: number,
  done: boolean,
  d: MyOneGymDB = db,
): Promise<void> {
  await d.sessionEntries.update(entryId, { done })
}

/**
 * "I did this one instead" — point a session entry at one of the alternatives
 * of the exercise it currently holds.
 *
 * Rewrites the exercise and its name snapshot, and deliberately leaves `done`
 * alone: swapping says "this is the one I did", not "undo it". No entry is
 * created or removed either, so the day's exercise count and the session's
 * progress never move — the workout still has exactly the lines the day had.
 *
 * The target must be an alternative of the entry's **current** exercise, read
 * live from the catalog. Only while the session is in progress: a completed
 * session records what happened.
 */
export async function swapEntryExercise(
  entryId: number,
  exerciseId: number,
  d: MyOneGymDB = db,
): Promise<void> {
  await d.transaction('rw', [d.sessionEntries, d.sessions, d.exercises], async () => {
    const entry = await d.sessionEntries.get(entryId)
    if (!entry) throw new ValidationError('Exercício da sessão não encontrado.')
    const session = await d.sessions.get(entry.sessionId)
    if (session?.status !== 'active') throw new ValidationError('Este treino já foi concluído.')

    const current = entry.exerciseId != null ? await d.exercises.get(entry.exerciseId) : undefined
    if (!current?.alternativeIds?.includes(exerciseId)) {
      throw new ValidationError('Este exercício não é uma alternativa do atual.')
    }
    const ex = await d.exercises.get(exerciseId)
    if (!ex) throw new ValidationError('Exercício não encontrado.')
    await d.sessionEntries.update(entryId, { exerciseId, exerciseName: ex.name })
  })
}

/** Mark an in-progress session completed, stamping the completion time. */
export async function completeSession(id: number, d: MyOneGymDB = db): Promise<void> {
  await d.sessions.update(id, { status: 'completed', completedAt: Date.now() })
}

/** Delete a session and all of its entries. Does not affect other data. */
export async function deleteSession(id: number, d: MyOneGymDB = db): Promise<void> {
  await d.transaction('rw', d.sessions, d.sessionEntries, async () => {
    await d.sessionEntries.where('sessionId').equals(id).delete()
    await d.sessions.delete(id)
  })
}
