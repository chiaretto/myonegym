import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    css: false,

    /**
     * The deadlines this suite imposes are a DECISION, not the tool's defaults.
     *
     * Vitest's 5 s `testTimeout` is calibrated for unit tests — a function, an
     * assertion, milliseconds. This suite is not that: 41 of its 76 files mount
     * the whole `<App/>` over a fake IndexedDB and wait for Dexie's liveQuery to
     * answer.
     *
     * On an idle machine the slowest test takes about 2.1 s — comfortable
     * against a 5 s ceiling. The problem is that the machine is not idle while
     * the suite runs: 76 jsdom environments cost ~200 s of setup between them,
     * and under that contention the SAME tests were measured at 4–6.5 s. The
     * margin, not the duration, was the defect.
     *
     * The evidence: five consecutive full runs before this change, four of them
     * red, never the same tests, every file passing when run alone. The run that
     * shared the machine with a second suite failed TEN tests at once, every one
     * of them `Test timed out in 5000ms`.
     *
     * 20 s is ~3× the worst duration ever observed under that contention, and
     * ~10× the idle-machine worst. Deliberately not higher: a ceiling with too
     * much slack turns a genuine hang into a long wait, which delays the
     * diagnosis instead of helping it.
     */
    testTimeout: 20_000,
    /** Same reasoning: `beforeEach` installs the OPFS shim and clears the query
     *  cache on every test, and the teardown clears a dozen Dexie tables. */
    hookTimeout: 20_000,

    /**
     * The counterweight to the ceilings above.
     *
     * Raising a timeout without this creates somewhere for slowness to hide: a
     * test that drifted from 900 ms to 4 s would stop failing and nobody would
     * know. The threshold keeps the reporter NAMING what is slow even when it
     * passes — the time now tolerated when failing is still reported when
     * listing.
     *
     * 2 s, not the 300 ms default: at 300 ms most of the integration files
     * qualify and the list says nothing. At 2 s the idle-machine list is two
     * tests long — short enough to act on, and a real baseline to compare
     * against when someone wonders whether the suite got slower.
     */
    slowTestThreshold: 2_000,
  },
})
