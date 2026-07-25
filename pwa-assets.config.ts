import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

/**
 * App icons, all derived from
 * `public/icon.png` — the single governed source for the brand mark.
 *
 * That master is the "M1" icon from the design handoff sheet
 * (`new-design/assets/icones.png`), cropped from its largest rendering — the
 * iOS hero tile, 311px — and resampled to 1024. It is raster, not vector,
 * because the sheet is the only artwork we have: if a vector master ever
 * arrives, swap this source back to an SVG and re-run.
 *
 * Run `npm run pwa-assets` to regenerate; the output is committed to `public/`
 * so `npm run build` never depends on sharp's native toolchain. Nothing here
 * may be edited by hand: to change the artwork, change the master and re-run.
 *
 * The iOS launch images are NOT generated here. They have their own artwork —
 * a full-bleed composition rather than the mark on a flat background — so they
 * have their own source and their own generator: `npm run splash`, see
 * scripts/gen-splash.mjs.
 *
 * #14171D mirrors --surface-2 in src/styles/tokens.css (the icon tile). It is a
 * hand-kept copy for the same reason the manifest's theme_color is: this file
 * cannot read a CSS custom property.
 */

/** The tile in icon.png. Filling with it makes the rounded corners opaque.
 *  Matches the artwork's own border tone (#191b1e) closely enough to blend. */
const TILE = '#14171D'

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  images: ['public/icon.png'],
  preset: {
    ...minimal2023Preset,

    // No padding: icon.png is already a tile with its own internal margins, so
    // the default 5% would only shrink the mark inside a transparent border.
    transparent: {
      ...minimal2023Preset.transparent,
      padding: 0,
      resizeOptions: { fit: 'contain', background: 'transparent' },
    },

    // Android's adaptive mask crops up to 10% per side and can round the tile
    // any way it likes. In icon.png the mark spans 84.1% of the width (measured
    // on the master: x=83..943 of 1024), centred. 5% padding scales the tile to
    // 95%, which lands the mark at ~80% — the outer red plates sit exactly on
    // the safe-zone edge — over a full-bleed tile colour so the mask never
    // reveals a corner the artwork didn't intend.
    maskable: {
      sizes: [512],
      padding: 0.05,
      resizeOptions: { fit: 'contain', background: TILE },
    },

    // iOS wants an opaque square and applies its own rounding. icon.png is
    // already opaque, so the fill is a no-op guard rather than a fix — kept so
    // a future transparent master can't silently produce a see-through icon.
    apple: {
      sizes: [180],
      padding: 0,
      resizeOptions: { fit: 'contain', background: TILE },
    },
  },
})
