/**
 * Turns the exercise masters into the files the app serves.
 *
 * The pictures used to be links to a dozen fitness sites. Each was a way for the
 * catalog to break with nobody touching this repo — a page that moves, a host
 * that starts refusing hotlinks, a domain that lapses — and none of them worked
 * at the gym with no signal, which is the one place the app is for. They were
 * downloaded **once**, into `data/assets/exercises/`, and those masters are now
 * the source: versioned, and the reason this script never needs a network.
 *
 * What it does, every run, idempotently:
 *
 *  - converts every master to `public/exercises/<slug>.webp`, capped in width,
 *    animation intact;
 *  - writes each exercise's `mediaFile` into the catalog;
 *  - sweeps `public/exercises/` of anything the catalog no longer names.
 *
 * Adding a picture is therefore: drop `data/assets/exercises/<slug>.<ext>` next
 * to the others and run this. The slug is the exercise's name, and the script
 * prints the exercises it found no master for.
 *
 * Where each master originally came from is recorded in
 * `data/assets/exercises/sources.json` — provenance, kept beside the masters
 * rather than in the catalog, because it matters to whoever maintains this and
 * not to any installed device.
 *
 * Run with `npm run exercise-media`.
 */
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CATALOG = resolve(root, 'src/data/officialCatalog.json')
/** Masters. Outside `public/` for the same reason the splash masters are: they
 *  are build inputs, and shipping ~16 MB of source GIF would be for nothing. */
const MASTERS = resolve(root, 'data/assets/exercises')
/** What the app serves, under its own base URL. */
const OUT = resolve(root, 'public/exercises')

/**
 * Widest the app ever paints one of these: the hero on the exercise detail,
 * which is the phone's width. 720 covers a 360pt screen at 2x; beyond that the
 * file grows and the screen cannot show it. Never enlarged — what came off those
 * sites ranges from 280px to a 4864x3389 photograph.
 */
const MAX_WIDTH = 720

const catalog = JSON.parse(readFileSync(CATALOG, 'utf8'))
mkdirSync(MASTERS, { recursive: true })
mkdirSync(OUT, { recursive: true })

/**
 * The file is named after the **exercise**, not after its id: it is legible in
 * the folder, in a network tab and in a bug report, where `1.webp` is a number
 * to go look up.
 *
 * Accents and punctuation go — these travel in URLs, and a percent-encoded name
 * is worse than no name. Two exercises that slug the same would collide, so the
 * id is appended when that happens, which keeps both files.
 */
const slug = (name) =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const slugs = new Map()
for (const ex of catalog.exercises) {
  const base = slug(ex.name)
  const clash = catalog.exercises.some((o) => o.id !== ex.id && slug(o.name) === base)
  slugs.set(ex.id, clash ? `${base}-${ex.id}` : base)
}

const masters = readdirSync(MASTERS).filter((f) => f !== 'sources.json')
const masterFor = (id) => masters.find((f) => f.replace(/\.[^.]+$/, '') === slugs.get(id))

let converted = 0
const missing = []

for (const ex of catalog.exercises) {
  const master = masterFor(ex.id)
  if (!master) {
    // No picture is a valid state — one exercise in the catalog never had one.
    // What must not happen is the catalog naming a file that is not there.
    delete ex.mediaFile
    missing.push(ex.name)
    continue
  }
  // `animated` keeps a demo GIF a demo: a still frame of a bench press is a
  // photograph of someone lying down.
  await sharp(resolve(MASTERS, master), { animated: true })
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: 80, effort: 4 })
    .toFile(resolve(OUT, `${slugs.get(ex.id)}.webp`))
  // Just the file name: the app resolves it against its own base URL, which
  // differs between the dev server and the deployed site.
  ex.mediaFile = `${slugs.get(ex.id)}.webp`
  converted++
}

// Anything left over is a picture whose exercise was renamed or dropped. Left
// behind it would ship forever, referenced by nothing.
const wanted = new Set(catalog.exercises.map((e) => e.mediaFile).filter(Boolean))
const stale = readdirSync(OUT).filter((f) => !wanted.has(f))
for (const f of stale) rmSync(resolve(OUT, f))

writeFileSync(CATALOG, `${JSON.stringify(catalog, null, 2)}\n`)

console.log(
  `✔ ${converted} imagens em public/exercises/` +
    (stale.length ? `, ${stale.length} obsoletas removidas` : ''),
)
if (missing.length) {
  console.log(`\nℹ ${missing.length} sem imagem (nenhum master em data/assets/exercises/):`)
  for (const m of missing) console.log(`   ${m}`)
}
