/**
 * Generates the launch screens from the splash artwork.
 *
 * Two outputs, because the two platforms could not be more different:
 *
 *  - `public/apple-splash-*.png` — iOS reads these from index.html's
 *    `<link rel="apple-touch-startup-image">` and needs one exact-pixel image
 *    per device size, hence twenty files.
 *  - `public/splash*.webp` — the in-app boot splash in index.html, **one per
 *    artwork the user can choose** (see `src/state/splashes.ts`). Android has no
 *    equivalent of the iOS launch image: Chrome composes a PWA's splash from the
 *    manifest icon, name and background_color, and there is no field for a
 *    custom picture. The only way to show this artwork on Android is to paint it
 *    ourselves on first frame, and that same overlay covers the gap between the
 *    iOS launch image and React's first render.
 *
 * The **launch images come from the default artwork only**. iOS reads them from
 * static `<link>`s and resolves them when the app is installed, so they cannot
 * follow a setting — twenty files per choice would also trade ~9 MB each for a
 * picture the OS shows for an instant.
 *
 * The icons come from a different source (`public/icon.png`) through a different
 * generator (`npm run pwa-assets`, pwa-assets.config.ts) — the splash is its own
 * full-bleed composition, not the mark on a flat background.
 *
 * The size list is not written down here: it is read out of index.html, whose
 * twenty `<link>` are the actual contract with iOS. Adding a device is therefore
 * a one-file change — add the link, re-run this — and src/lib/installAssets.test.ts
 * fails if the two ever drift.
 *
 * Run with `npm run splash`.
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * The masters. Versioned — they are build inputs, not mockups, and a generator
 * whose source is untracked cannot be re-run from a fresh checkout. They live in
 * new-design/assets/ (versioned) rather than new-design/reference/ (gitignored)
 * for exactly that reason, and outside public/ because at ~1.4 MB each they
 * would ship to the deployed site for nothing: everything derived from them is
 * committed.
 *
 * `out` MUST match the `file` of the matching entry in `src/state/splashes.ts`.
 * The two lists cannot import each other — this is a Node script and that is
 * TypeScript — so `src/state/splashes.test.ts` fails if they drift, the same
 * guard the launch-image list already has.
 */
const SPLASHES = [
  { master: 'new-design/assets/splash_vazio.png', out: 'splash-vazio.webp', isDefault: true },
  { master: 'new-design/assets/splash_homem.png', out: 'splash-homem.webp' },
  { master: 'new-design/assets/splash_mulher.png', out: 'splash-mulher.webp' },
]

/**
 * The launch images are cut from the **default** artwork alone — see the header.
 * It is the default because `SPLASHES[0]` in src/state/splashes.ts is, and the
 * two have to agree: an iPhone whose owner never opened Aparência must not be
 * handed one picture by the OS and a different one by the app a frame later.
 */
const SOURCE = resolve(root, SPLASHES.find((s) => s.isDefault).master)

/** --surface-0 in src/styles/tokens.css. Only ever seen if a target cannot be
 *  covered, which `fit: cover` makes impossible — belt and braces, not design. */
const APP_BG = '#050607'

const html = readFileSync(resolve(root, 'index.html'), 'utf8')
const links = html.match(/<link[^>]*rel="apple-touch-startup-image"[^>]*>/g) ?? []

if (links.length === 0) {
  throw new Error('index.html declares no apple-touch-startup-image links')
}

const targets = links.map((tag) => {
  const href = /href="([^"]+)"/.exec(tag)?.[1]
  if (!href) throw new Error(`launch image link has no href: ${tag}`)
  // Strip the production base so the name matches the file in public/.
  const file = href.replace(/^\/(myonegym\/)?/, '')
  const size = /-(\d+)x(\d+)\.png$/.exec(file)
  if (!size) throw new Error(`cannot read a WxH size out of "${file}"`)
  return { file, width: Number(size[1]), height: Number(size[2]) }
})

// `cover` crops rather than letterboxes: the artwork is a portrait composition
// whose lockup sits dead centre, so cropping to a device's aspect ratio trims
// the photographic edges and leaves the mark intact. `contain` would band the
// screen with APP_BG on every device whose ratio differs from the source's —
// and on landscape sizes, which the portrait-locked app only ever shows for the
// instant before the OS rotates, it would be almost all band.
// PNG because that is what iOS reads for a launch image, but palette-quantised:
// the artwork is a photograph, and full-colour PNG is the wrong container for
// one — 3 MB for the 1290x2796 alone, 37 MB across the twenty. Quantising costs
// nothing visible here (the composition is near-monochrome, dark greys and one
// red) and brings the set to roughly 9 MB.
await Promise.all(
  targets.map(({ file, width, height }) =>
    sharp(SOURCE)
      .resize(width, height, { fit: 'cover', position: 'centre', background: APP_BG })
      .png({ compressionLevel: 9, palette: true, quality: 90 })
      .toFile(resolve(root, 'public', file)),
  ),
)

// WebP at each master's native width: the browser scales it to whatever the
// viewport is, and re-encoding turns 1.7 MB of PNG into ~65 KB — small enough to
// precache, which matters because the boot splash has to paint offline too, and
// all of them are precached now rather than only the one in use.
await Promise.all(
  SPLASHES.map(({ master, out }) =>
    sharp(resolve(root, master))
      .webp({ quality: 82 })
      .toFile(resolve(root, 'public', out)),
  ),
)

console.log(
  `✔ ${targets.length} launch images from ${SOURCE.replace(root + '/', '')}` +
    ` + ${SPLASHES.length} boot splashes (${SPLASHES.map((s) => s.out).join(', ')})`,
)
