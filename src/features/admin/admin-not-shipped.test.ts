import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The catalog editor must not reach the published app.
 *
 * It is a maintenance tool that talks to the dev server: published, it could
 * only be a screen that fails at everything it tries — there is no API on the
 * other side — and a "hidden" URL in the open invites whoever finds it. It also
 * has no business costing every install the bytes.
 *
 * The mechanism is `import.meta.env.DEV`, a constant the build folds to `false`,
 * which makes the ternary in `App.tsx` — dynamic import and all — dead code. It
 * works, and it works *silently*: nothing about `dist` would look wrong if a
 * refactor made the condition non-constant and shipped the whole screen. This is
 * what notices.
 *
 * It runs against whatever `dist` is lying around, if any. `npm run build`
 * followed by the suite is what makes it a real check; on a checkout with no
 * build it stands aside rather than pretending.
 */
const dist = resolve(__dirname, '../../../dist')

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = resolve(dir, entry)
    return statSync(path).isDirectory() ? filesUnder(path) : [path]
  })
}

describe('the admin screen is not in the build', () => {
  it.skipIf(!existsSync(dist))('leaves no trace of itself in dist/', () => {
    const scripts = filesUnder(dist).filter((f) => f.endsWith('.js'))
    expect(scripts.length).toBeGreaterThan(0)

    for (const file of scripts) {
      const source = readFileSync(file, 'utf8')
      // The route path, the API it would call, and a string only this screen
      // has — any one of them means it shipped.
      expect(source, `${file}: a rota /admin foi para o build`).not.toContain('"/admin"')
      expect(source, `${file}: a API do admin foi para o build`).not.toContain('/api/admin/')
      expect(source, `${file}: a tela do admin foi para o build`).not.toContain(
        'Catálogo oficial',
      )
    }
  })
})
