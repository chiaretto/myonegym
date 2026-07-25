import { readdirSync, existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The install assets are generated — icons by `npm run pwa-assets`
 * (pwa-assets.config.ts), launch screens by `npm run splash`
 * (scripts/gen-splash.mjs) — but *referenced* by hand: twenty
 * `<link rel="apple-touch-startup-image">` in index.html, the boot splash's
 * background-image, and the icon list in the manifest. Nothing at build time
 * checks that those references still point at files that exist: a missing
 * launch image just silently degrades to a blank screen on the device.
 *
 * These tests are that check. index.html is the source of truth for which
 * launch images exist — gen-splash.mjs reads its `<link>` list — so adding a
 * device means adding a link and re-running `npm run splash`.
 */

/** Vitest runs from the project root, so these are repo-relative paths. */
const root = (p: string) => resolve(process.cwd(), p)

const html = readFileSync(root('index.html'), 'utf8')
const viteConfig = readFileSync(root('vite.config.ts'), 'utf8')
const publicFiles = readdirSync(root('public'))

/** Strips the production base back off, so both dev and build paths resolve. */
function toPublicFile(href: string) {
  return href.replace(/^\/(myonegym\/)?/, '')
}

function hrefs(rel: string) {
  const re = new RegExp(`<link[^>]*rel="${rel}"[^>]*>`, 'g')
  return (html.match(re) ?? []).map((tag) => /href="([^"]+)"/.exec(tag)![1])
}

describe('install assets', () => {
  it('every apple-touch-startup-image points at a file that exists', () => {
    const links = hrefs('apple-touch-startup-image')
    expect(links.length).toBeGreaterThan(0)
    const missing = links.map(toPublicFile).filter((f) => !existsSync(root(`public/${f}`)))
    expect(missing).toEqual([])
  })

  it('every generated launch image is referenced by index.html', () => {
    const generated = publicFiles.filter((f) => f.startsWith('apple-splash-'))
    const referenced = new Set(hrefs('apple-touch-startup-image').map(toPublicFile))
    const orphans = generated.filter((f) => !referenced.has(f))
    expect(orphans).toEqual([])
  })

  it('each launch image is claimed by exactly one media query', () => {
    const referenced = hrefs('apple-touch-startup-image').map(toPublicFile)
    expect(new Set(referenced).size).toBe(referenced.length)
  })

  it('the apple-touch-icon and favicons exist', () => {
    const links = [...hrefs('apple-touch-icon'), ...hrefs('icon')]
    expect(links.length).toBeGreaterThan(0)
    const missing = links.map(toPublicFile).filter((f) => !existsSync(root(`public/${f}`)))
    expect(missing).toEqual([])
  })

  it('every manifest icon exists in public/', () => {
    // The icons array lives in vite.config.ts; read it as text rather than
    // executing the config, which would mean booting the whole plugin chain.
    const icons = [...viteConfig.matchAll(/src: '([^']+\.(?:png|svg))'/g)].map((m) => m[1])
    expect(icons.length).toBeGreaterThan(0)
    const missing = icons.filter((f) => !existsSync(root(`public/${f}`)))
    expect(missing).toEqual([])
  })

  it('the boot splash paints an image that exists', () => {
    // Android gets no launch image from the OS, so this overlay is the only
    // place the splash artwork can appear there. A broken URL degrades to a
    // flat dark rectangle, which looks like a bug rather than a brand.
    const url = /#splash\s*\{[^}]*url\(['"]%BASE_URL%([^'"]+)['"]\)/.exec(html)?.[1]
    expect(url).toBeDefined()
    expect(existsSync(root(`public/${url}`))).toBe(true)
  })

  it('keeps the boot splash fade in step between index.html and bootSplash.ts', () => {
    // The overlay is removed on a timer, not on transitionend. If the CSS fade
    // outlasted the timer the element would vanish mid-fade; if the timer
    // outlasted the fade it would sit invisible over the app, eating taps.
    const css = /#splash\s*\{[^}]*transition:\s*opacity\s*(\d+)ms/.exec(html)?.[1]
    const ts = readFileSync(root('src/lib/bootSplash.ts'), 'utf8')
    const js = /const FADE_MS = (\d+)/.exec(ts)?.[1]
    expect(css).toBeDefined()
    expect(js).toBe(css)
  })

  it('ships both a maskable icon and the raster sizes Android installs need', () => {
    for (const f of ['maskable-icon-512x512.png', 'pwa-192x192.png', 'pwa-512x512.png']) {
      expect(publicFiles).toContain(f)
    }
  })
})
