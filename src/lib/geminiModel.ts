/**
 * Which Gemini model the assistant talks to.
 *
 * It lives alone, in a module with **no relative imports**, so two very
 * different loaders can both read it: Vite (for the app) and plain Node (for
 * `scripts/spike-gemini.mts`, which verifies the contract against the real API).
 * Node's ESM resolver needs explicit file extensions, and the rest of the app
 * imports without them — a constant with no dependencies sidesteps that whole
 * problem, and the spike can therefore test *the model the app actually uses*
 * instead of a copy that silently drifts.
 *
 * Chosen for cost: the flash-lite line is the cheapest tier. It is also the tier
 * this task leans on hardest — a proposal echoes the entire catalog back with
 * every id preserved and every `ref` resolving, and here **omitting is
 * deleting**, so a forgotten exercise is not "no change" but a removal.
 * `validateProposal` refuses anything whose ids or refs do not resolve, and the
 * card shows a per-section removal count before the user accepts; the spike is
 * what tells us whether the tier holds up before either of those has to. It
 * does: 64 of 64 exercises returned, no invented ids, every ref resolving.
 *
 * **Pinned to 3.5, not 2.5.** `gemini-2.5-flash-lite` still appears in the
 * models list, but the API answers a 404 for it — *"no longer available to new
 * users"* — so a fresh key cannot use it at all. Pinned rather than tracking
 * `gemini-flash-lite-latest`, because this feature's correctness rests on the
 * model faithfully echoing a whole catalog, and an alias would change that
 * behaviour underneath us with no warning and no test run.
 */
export const MODEL = 'gemini-3.5-flash-lite'
