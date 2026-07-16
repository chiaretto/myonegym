import { db, type MyOneGymDB } from './db'
import {
  UNCATEGORIZED,
  type Category,
  type Day,
  type Exercise,
  type ExerciseNote,
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

/** Delete a gym and cascade to its weights, history, and exercise notes. */
export async function deleteGym(id: number, d: MyOneGymDB = db): Promise<void> {
  await d.transaction('rw', d.gyms, d.weights, d.weightHistory, d.exerciseNotes, async () => {
    await d.weights.where('gymId').equals(id).delete()
    await d.weightHistory.where('gymId').equals(id).delete()
    await d.exerciseNotes.where('gymId').equals(id).delete()
    await d.gyms.delete(id)
  })
}

/* ------------------------------------------------------------ categories */

export async function listCategories(d: MyOneGymDB = db): Promise<Category[]> {
  return d.categories.orderBy('name').toArray()
}

/** Get or lazily create the reserved "Sem categoria" bucket. */
export async function ensureUncategorized(d: MyOneGymDB = db): Promise<number> {
  const existing = await d.categories.where('name').equals(UNCATEGORIZED).first()
  if (existing?.id != null) return existing.id
  return d.categories.add({ name: UNCATEGORIZED, reserved: true })
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
 * Delete a category. Exercises pointing at it are reassigned to the reserved
 * "Sem categoria" bucket — never orphaned. Days reference exercises (not
 * categories), so they need no reassignment. The reserved bucket itself cannot
 * be deleted.
 */
export async function deleteCategory(id: number, d: MyOneGymDB = db): Promise<void> {
  await d.transaction('rw', d.categories, d.exercises, async () => {
    const cat = await d.categories.get(id)
    if (!cat) return
    if (cat.reserved) throw new ValidationError('A categoria "Sem categoria" não pode ser excluída.')
    const fallback = await ensureUncategorizedTx(d)
    await d.exercises.where('categoryId').equals(id).modify({ categoryId: fallback })
    await d.categories.delete(id)
  })
}

// Same as ensureUncategorized but reuses the current transaction.
async function ensureUncategorizedTx(d: MyOneGymDB): Promise<number> {
  const existing = await d.categories.where('name').equals(UNCATEGORIZED).first()
  if (existing?.id != null) return existing.id
  return d.categories.add({ name: UNCATEGORIZED, reserved: true })
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
  input: { name: string; mediaUrl?: string; categoryId?: number },
  d: MyOneGymDB = db,
): Promise<number> {
  const name = requireName(input.name, 'nome do exercício')
  const mediaUrl = validateMediaUrl(input.mediaUrl)
  return d.exercises.add({ name, mediaUrl, categoryId: input.categoryId })
}

export async function updateExercise(
  id: number,
  input: { name: string; mediaUrl?: string; categoryId?: number },
  d: MyOneGymDB = db,
): Promise<void> {
  const name = requireName(input.name, 'nome do exercício')
  const mediaUrl = validateMediaUrl(input.mediaUrl)
  await d.exercises.update(id, { name, mediaUrl, categoryId: input.categoryId })
}

/**
 * Delete an exercise: pull it from all days and drop its weights, history, and
 * per-gym notes.
 */
export async function deleteExercise(id: number, d: MyOneGymDB = db): Promise<void> {
  await d.transaction(
    'rw',
    d.exercises,
    d.days,
    d.weights,
    d.weightHistory,
    d.exerciseNotes,
    async () => {
      await d.days
        .filter((day) => day.exerciseIds.includes(id))
        .modify((day) => {
          day.exerciseIds = day.exerciseIds.filter((x) => x !== id)
        })
      await d.weights.where('exerciseId').equals(id).delete()
      await d.weightHistory.where('exerciseId').equals(id).delete()
      await d.exerciseNotes.where('exerciseId').equals(id).delete()
      await d.exercises.delete(id)
    },
  )
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

/* ------------------------------------------------------------- sessions */

export interface SessionSummary {
  session: Session
  total: number
  done: number
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
 * Start a workout session for a day in the given gym. Snapshots the day's
 * exercises into entries, each pre-filled with the exercise's CURRENT target
 * weight for the gym (or empty when unset). Rejects if the gym already has an
 * in-progress session (only one active session per gym). Returns the new id.
 */
export async function startSession(
  gymId: number,
  dayId: number,
  d: MyOneGymDB = db,
): Promise<number> {
  return d.transaction(
    'rw',
    d.sessions,
    d.sessionEntries,
    d.days,
    d.exercises,
    d.weights,
    async () => {
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
        const w = await d.weights.where('[gymId+exerciseId]').equals([gymId, exId]).first()
        await d.sessionEntries.add({
          sessionId,
          exerciseId: exId,
          exerciseName: ex.name,
          usedValue: w?.value,
          usedUnit: w?.unit,
          done: false,
        })
      }
      return sessionId
    },
  )
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
export async function listSessionSummaries(
  gymId: number,
  d: MyOneGymDB = db,
): Promise<SessionSummary[]> {
  const sessions = (
    await d.sessions
      .where('gymId')
      .equals(gymId)
      .filter((s) => s.status === 'completed')
      .toArray()
  ).sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0) || (b.id ?? 0) - (a.id ?? 0))

  const out: SessionSummary[] = []
  for (const session of sessions) {
    const entries = await d.sessionEntries.where('sessionId').equals(session.id!).toArray()
    out.push({ session, total: entries.length, done: entries.filter((e) => e.done).length })
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

/** Set the weight actually used for a session entry (does NOT touch the target). */
export async function setEntryWeight(
  entryId: number,
  value: number,
  unit: Unit,
  d: MyOneGymDB = db,
): Promise<void> {
  if (!Number.isFinite(value) || value < 0) throw new ValidationError('Peso inválido.')
  await d.sessionEntries.update(entryId, { usedValue: value, usedUnit: unit })
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
