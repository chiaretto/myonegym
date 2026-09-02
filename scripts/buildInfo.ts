import pkg from '../package.json'

/**
 * The two build stamps the app shows in Settings → "Atualizar app".
 *
 * They exist because a PWA cannot tell the user which version it is running,
 * and that is the first question of anyone who came to that screen. The values
 * come from the BUILD — a version typed by hand in a component starts lying the
 * first time someone forgets to bump it, and lying is the one defect this
 * particular screen cannot afford.
 *
 * Shared by vite.config.ts and vitest.config.ts on purpose: the two configs are
 * separate files here, and a global that exists in one but not the other turns
 * every test that renders the screen red for a defect the product does not have.
 *
 * `MYONEGYM_BUILD_TIME` pins the stamp when it is set. The suite sets it to a
 * fixed instant so a test can assert the rendered date; without it the stamp is
 * "now", which is what a real build wants.
 */
export function buildDefine(): Record<string, string> {
  return {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIME__: JSON.stringify(process.env.MYONEGYM_BUILD_TIME ?? new Date().toISOString()),
  }
}
