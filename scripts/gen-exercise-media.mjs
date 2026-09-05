/**
 * Rebuilds every exercise picture the app serves, from the masters.
 *
 * The pictures used to be links to a dozen fitness sites. Each was a way for the
 * catalog to break with nobody touching this repo — a page that moves, a host
 * that starts refusing hotlinks, a domain that lapses — and none of them worked
 * at the gym with no signal, which is the one place the app is for. They were
 * downloaded **once**, into `data/assets/exercises/`, and those masters are now
 * the source: versioned, and the reason this script never touches the network.
 *
 * Every run, idempotently: converts each master to
 * `public/exercises/<slug>.webp`, writes each exercise's `mediaFile`, and sweeps
 * anything the catalog no longer names.
 *
 * Adding a picture by hand is: drop `data/assets/exercises/<slug>.<ext>` next to
 * the others and run this — the script prints the exercises it found none for.
 * The `/admin` screen does the same thing one exercise at a time, through the
 * very same module (`exerciseMedia.mjs`), which is what keeps the two producing
 * identical files.
 *
 * Where each master originally came from is recorded in
 * `data/assets/exercises/sources.json` — provenance, kept beside the masters
 * rather than in the catalog, because it matters to whoever maintains this and
 * not to any installed device.
 *
 * Run with `npm run exercise-media`.
 */
import {
  convertMaster,
  masterFor,
  readCatalog,
  slugsByExercise,
  sweepServed,
  writeCatalog,
} from './exerciseMedia.mjs'

const catalog = readCatalog()
const slugs = slugsByExercise(catalog.exercises)

let converted = 0
const missing = []

for (const ex of catalog.exercises) {
  const base = slugs.get(ex.id)
  const master = masterFor(base)
  if (!master) {
    // No picture is a valid state — one exercise in the catalog never had one.
    // What must not happen is the catalog naming a file that is not there.
    delete ex.mediaFile
    missing.push(ex.name)
    continue
  }
  ex.mediaFile = await convertMaster(master, base)
  converted++
}

const stale = sweepServed(catalog)
writeCatalog(catalog)

console.log(
  `✔ ${converted} imagens em public/exercises/` +
    (stale.length ? `, ${stale.length} obsoletas removidas` : ''),
)
if (missing.length) {
  console.log(`\nℹ ${missing.length} sem imagem (nenhum master em data/assets/exercises/):`)
  for (const m of missing) console.log(`   ${m}`)
}
