/**
 * Everything about an official exercise's picture, in one place.
 *
 * Two callers need to produce the **same file**: `npm run exercise-media`, which
 * rebuilds them all from the masters, and the `/admin` screen, which saves one
 * at a time while someone edits the catalog. Same slug, same width cap, same
 * quality — two copies of that would diverge the first time either was tuned.
 *
 * It is the shape `scripts/buildInfo.ts` already established here: a module the
 * build and the app both read, rather than two truths about one thing.
 *
 * Plain `.mjs` because the generator is run by `node` directly, which cannot
 * load TypeScript. `exerciseMedia.d.mts` next to it is what makes the config and
 * the plugin type-check.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

export const CATALOG = resolve(root, 'src/data/officialCatalog.json')
/** Masters. Outside `public/` for the same reason the splash masters are: they
 *  are build inputs, and shipping ~16 MB of source GIF would be for nothing. */
export const MASTERS = resolve(root, 'data/assets/exercises')
/** What the app serves, under its own base URL. */
export const OUT = resolve(root, 'public/exercises')

/**
 * Where each master came from, keyed by slug.
 *
 * Provenance for 51 third-party images: the maintainer's business, and nobody
 * else's — which is why it sits beside the masters instead of in the catalog
 * that ships to every device.
 */
export const SOURCES = resolve(MASTERS, 'sources.json')

/**
 * Widest the app ever paints one of these: the hero on the exercise detail,
 * which is the phone's width. 720 covers a 360pt screen at 2x; beyond that the
 * file grows and the screen cannot show it. Never enlarged — what came off those
 * sites ranges from 280px to a 4864x3389 photograph.
 */
export const MAX_WIDTH = 720

/** Long enough for a slow site, short enough that a dead one does not hold a
 *  save open. The failure is reported; the rest of the save still happens. */
export const DOWNLOAD_TIMEOUT_MS = 15000

/** A browser-ish UA: several of these hosts answer 403 to a bare fetch. */
const HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
  accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
}

/**
 * The name of an exercise's file, from the exercise's own name.
 *
 * Legible in the folder, in a network tab and in a bug report, where `1.webp` is
 * a number to go look up. Accents and punctuation go — these travel in URLs, and
 * a percent-encoded name is worse than no name.
 */
export function slug(name) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * The slug of every exercise, keyed by id.
 *
 * Computed over the whole catalog rather than one name at a time, because two
 * exercises that slug the same would collide: the id is appended when that
 * happens, which keeps both files. That is a question only the full list can
 * answer.
 */
export function slugsByExercise(exercises) {
  const out = new Map()
  for (const ex of exercises) {
    const base = slug(ex.name)
    const clash = exercises.some((o) => o.id !== ex.id && slug(o.name) === base)
    out.set(ex.id, clash ? `${base}-${ex.id}` : base)
  }
  return out
}

/** The file extension to save a downloaded picture under, read off its URL. */
export function extensionFor(url) {
  const m = /\.(gif|jpe?g|png|webp)(?:[?#]|$)/i.exec(url)
  return m ? m[1].toLowerCase().replace('jpeg', 'jpg') : 'jpg'
}

/** Read `sources.json`; `{}` when it is not there yet. */
export function readSources() {
  return existsSync(SOURCES) ? JSON.parse(readFileSync(SOURCES, 'utf8')) : {}
}

/**
 * Write `sources.json` back.
 *
 * Insertion order is kept as it comes — a new entry lands at the end and
 * nothing else moves. Sorting would be tidier once and then churn every review
 * that touches one picture with fifty lines that only changed position.
 */
export function writeSources(sources) {
  mkdirSync(MASTERS, { recursive: true })
  writeFileSync(SOURCES, `${JSON.stringify(sources, null, 2)}\n`)
}

/** The master file for `base`, whatever extension it was saved under. */
export function masterFor(base) {
  mkdirSync(MASTERS, { recursive: true })
  return readdirSync(MASTERS)
    .filter((f) => f !== 'sources.json')
    .find((f) => f.replace(/\.[^.]+$/, '') === base)
}

/**
 * Convert a master into the file the app serves.
 *
 * `animated` keeps a demo GIF a demo: a still frame of a bench press is a
 * photograph of someone lying down.
 */
export async function convertMaster(master, base) {
  mkdirSync(OUT, { recursive: true })
  await sharp(resolve(MASTERS, master), { animated: true })
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: 80, effort: 4 })
    .toFile(resolve(OUT, `${base}.webp`))
  return `${base}.webp`
}

/**
 * Fetch a picture into the masters folder, under `base`.
 *
 * Only `/admin` calls this. The generator does not: the pictures were downloaded
 * once, and a script that reaches the network every run would make a rebuild
 * depend on a dozen sites still being up.
 */
export async function downloadMaster(url, base) {
  mkdirSync(MASTERS, { recursive: true })
  const res = await fetch(url, {
    headers: HEADERS,
    redirect: 'follow',
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const bytes = Buffer.from(await res.arrayBuffer())
  if (bytes.length === 0) throw new Error('resposta vazia')

  // The old master goes only once the new one is in hand: a failed download must
  // not cost the picture that was already there.
  const existing = masterFor(base)
  const file = `${base}.${extensionFor(url)}`
  writeFileSync(resolve(MASTERS, file), bytes)
  if (existing && existing !== file) rmSync(resolve(MASTERS, existing))

  // Provenance, recorded at the only moment it is known. A master with no entry
  // here is one nobody can trace back, and the catalog tests notice.
  writeSources({ ...readSources(), [base]: url })
  return file
}

/** Forget a picture entirely — master, served copy and provenance. */
export function removeMedia(base) {
  const master = masterFor(base)
  if (master) rmSync(resolve(MASTERS, master))
  rmSync(resolve(OUT, `${base}.webp`), { force: true })

  const sources = readSources()
  if (base in sources) {
    delete sources[base]
    writeSources(sources)
  }
}

/**
 * Move a picture from one slug to another — master, served copy and provenance
 * together.
 *
 * Renaming an exercise renames its file. Left behind, the old one would be
 * published forever with nothing pointing at it; and the sources entry would
 * describe a name that no longer exists.
 */
export function renameMedia(from, to) {
  if (from === to) return
  const master = masterFor(from)
  if (master) {
    renameSync(resolve(MASTERS, master), resolve(MASTERS, master.replace(/^[^.]*/, to)))
  }
  if (existsSync(resolve(OUT, `${from}.webp`))) {
    renameSync(resolve(OUT, `${from}.webp`), resolve(OUT, `${to}.webp`))
  }
  const sources = readSources()
  if (from in sources) {
    sources[to] = sources[from]
    delete sources[from]
    writeSources(sources)
  }
}

/** Read the catalog as it is on disk. */
export function readCatalog() {
  return JSON.parse(readFileSync(CATALOG, 'utf8'))
}

/**
 * Write the catalog back, whole.
 *
 * Never a patch, and always this formatting: the generator and `/admin` both
 * write this file, and two writers with different ideas about it would fight
 * over the same lines at every commit.
 */
export function writeCatalog(catalog) {
  writeFileSync(CATALOG, `${JSON.stringify(catalog, null, 2)}\n`)
}

/**
 * Delete anything in `public/exercises/` the catalog no longer names.
 *
 * A renamed exercise leaves its old file behind; shipped forever, referenced by
 * nothing.
 */
export function sweepServed(catalog) {
  mkdirSync(OUT, { recursive: true })
  const wanted = new Set(catalog.exercises.map((e) => e.mediaFile).filter(Boolean))
  const stale = readdirSync(OUT).filter((f) => !wanted.has(f))
  for (const f of stale) rmSync(resolve(OUT, f))
  return stale
}
