/**
 * Where an exercise photo's **image bytes** live.
 *
 * The bytes are written as a file in the **origin private file system** (OPFS):
 * a real file on the device's disk, sandboxed to this origin — invisible in the
 * photo gallery, unreachable by any other site, never uploaded. The database
 * record keeps only the metadata plus the file's name, so listing an exercise's
 * photos no longer drags a few MB of image through a structured clone.
 *
 * Two things keep this honest:
 *
 * - **No global capability flag.** Every write simply tries OPFS and falls back
 *   to bytes-in-the-record when it can't (an older browser, or Safari before 17,
 *   where an OPFS handle offers no `createWritable` and writing would need a
 *   worker). Each record therefore says where its own image is, and both shapes
 *   coexist in the same database.
 * - **A full disk is not a fallback.** `QuotaExceededError` propagates: the
 *   database would be just as full, and silently retrying there would trade a
 *   clear error for a mysterious one.
 */

const DIR = 'photos'

/** The outcome of storing an image — exactly one of `file`/`bytes` is set. */
export interface StoredImage {
  /** File name inside the app's photo directory (OPFS). */
  file?: string
  /** Fallback: the bytes themselves, to be kept in the record as before. */
  bytes?: ArrayBuffer
  size: number
}

/** Enough of a photo record to find its image. */
export interface ImageRef {
  file?: string
  bytes?: ArrayBuffer
  type: string
}

/** An image that cannot be read — a missing file, or a record with no image. */
export class PhotoImageError extends Error {}

/**
 * `keys()` is part of OPFS everywhere it ships, but TypeScript's DOM lib does
 * not declare the async iterators of `FileSystemDirectoryHandle` yet.
 */
type PhotoDirectory = FileSystemDirectoryHandle & { keys?: () => AsyncIterableIterator<string> }

function isQuotaExceeded(err: unknown): boolean {
  return (err as { name?: string } | null)?.name === 'QuotaExceededError'
}

async function root(): Promise<FileSystemDirectoryHandle | null> {
  try {
    return (await navigator.storage?.getDirectory?.()) ?? null
  } catch {
    return null
  }
}

/** The app's photo directory, or null when this browser has no OPFS. */
async function photosDir(create: boolean): Promise<PhotoDirectory | null> {
  const dir = await root()
  if (!dir) return null
  try {
    return (await dir.getDirectoryHandle(DIR, { create })) as PhotoDirectory
  } catch {
    // create: false and nothing stored yet — a normal state, not a failure.
    return null
  }
}

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

let counter = 0

/** A name no other photo has. The extension is cosmetic — the record's `type`
 *  is what rebuilds the Blob — but it makes the directory readable in DevTools. */
function fileName(type: string): string {
  const id = crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${(counter++).toString(36)}`
  return `${id}.${EXTENSIONS[type] ?? 'bin'}`
}

/**
 * Write an image, preferring a file in OPFS and falling back to raw bytes for
 * the record. Throws only when the device is out of space — every other failure
 * degrades to the fallback, because a photo the user just took must not be lost
 * over a storage detail.
 */
export async function writeImage(image: Blob): Promise<StoredImage> {
  const dir = await photosDir(true)
  if (dir) {
    const name = fileName(image.type)
    try {
      const handle = await dir.getFileHandle(name, { create: true })
      if (typeof handle.createWritable === 'function') {
        const stream = await handle.createWritable()
        try {
          await stream.write(image)
          await stream.close()
        } catch (err) {
          await stream.abort?.().catch(() => {})
          throw err
        }
        return { file: name, size: image.size }
      }
      // Safari < 17: the handle exists but can only be written from a worker.
      // Drop the empty file we just created and store the bytes instead.
      await dir.removeEntry(name).catch(() => {})
    } catch (err) {
      await dir.removeEntry(name).catch(() => {})
      if (isQuotaExceeded(err)) throw err
    }
  }
  return { bytes: await image.arrayBuffer(), size: image.size }
}

/** Read a photo's image as a Blob, wherever it lives. */
export async function readImage(photo: ImageRef): Promise<Blob> {
  if (photo.file) {
    const dir = await photosDir(false)
    if (!dir) throw new PhotoImageError('Armazenamento de fotos indisponível.')
    let stored: File
    try {
      stored = await (await dir.getFileHandle(photo.file)).getFile()
    } catch {
      throw new PhotoImageError('A imagem desta foto não está mais no dispositivo.')
    }
    // `slice` re-labels the Blob without copying it: a file read back from OPFS
    // carries no mime type of its own, and the record is where that is kept.
    return stored.slice(0, stored.size, photo.type)
  }
  if (photo.bytes) return new Blob([photo.bytes], { type: photo.type })
  throw new PhotoImageError('Esta foto não tem imagem.')
}

/**
 * Delete a photo's file. Best-effort on purpose: the record is the source of
 * truth and is already gone by the time this runs, so a file left behind is
 * garbage the orphan sweep collects — not an error worth failing a deletion for.
 */
export async function removeImage(photo: Pick<ImageRef, 'file'>): Promise<void> {
  if (!photo.file) return
  const dir = await photosDir(false)
  if (!dir) return
  await dir.removeEntry(photo.file).catch(() => {})
}

/**
 * Delete every file no record references, returning how many went. A record and
 * its file are deleted in two steps that no transaction spans, so a crash
 * between them leaves a file nothing can reach and nothing will ever free.
 *
 * Deletes files only — never records. Records are the source of truth here.
 */
export async function sweepOrphans(keep: ReadonlySet<string>): Promise<number> {
  const dir = await photosDir(false)
  if (!dir || typeof dir.keys !== 'function') return 0
  const stale: string[] = []
  try {
    for await (const name of dir.keys()) {
      if (!keep.has(name)) stale.push(name)
    }
  } catch {
    return 0
  }
  let removed = 0
  for (const name of stale) {
    try {
      await dir.removeEntry(name)
      removed++
    } catch {
      /* another tab may have removed it already */
    }
  }
  return removed
}

/** Drop the whole photo directory — for a reset or a replace-all import. */
export async function clearImages(): Promise<void> {
  const dir = await root()
  if (!dir) return
  await dir.removeEntry(DIR, { recursive: true }).catch(() => {})
}
