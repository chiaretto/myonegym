# Proposal: Richer Example Data from a Bundled Backup

**Change ID:** `example-data-from-backup`
**Created:** 2026-07-10
**Status:** Implementation Complete
**Completed:** 2026-07-10
**Implements:** GitHub issue #4 — "Alterar massa de dados de exemplo"

---

## Problem Statement

- **What problem are we solving?** "Gerar exemplo" currently seeds a tiny hand-
  coded demo (5 categories, 8 exercises, 3 days, a couple of weights). Issue #4
  provides a **realistic backup JSON** to use instead — a full routine that
  makes the app feel real when exploring.
- **Who is affected?** New users (and anyone resetting) who tap **Gerar
  exemplo** to explore the app.
- **Current pain point?** The demo is minimal and unrealistic; the issue wants
  the attached dataset used as the sample data.

## Proposed Solution

Bundle the issue's backup JSON and have `generateExample` build the routine from
it, inserted **additively with remapped ids** (safe even if data already exists).

- **Bundle the dataset.** Add the issue's JSON to the repo (`src/data/
  example-data.json`) and import it (bundled → offline-safe, no fetch).
- **Rewrite `generateExample`** to insert from the dataset:
  - **Categories** (8) — reused by name if already present (dedup), building an
    old→new id remap.
  - **Exercises** (27, with media URLs) — inserted with the remapped `categoryId`.
  - **Days** (6, e.g. "Dia 1 - Peito e Tríceps") — inserted with remapped
    `exerciseIds`. The JSON's per-day `categoryId` is **ignored** (day categories
    are derived from exercises since issue #1).
  - **Gym + weights** — the example gym **"Fit Park"** and its 18 per-gym weights
    (remapped) are seeded **only when no gym exists yet** (as today), each with a
    seed history entry so the sparkline has data.
- **Everything stays additive/safe** via id remapping — existing data is never
  overwritten (consistent with the current "little or no data" behaviour).

## Scope

### In Scope
- Bundle `src/data/example-data.json` (the issue's backup content).
- Rewrite `generateExample` to build the routine from it with id remapping.
- Update the `generate example` data-layer test to the new dataset.
- Decouple the **home** and **session** integration tests from the example
  content (seed their own minimal fixtures via repos) so they don't depend on
  the sample data.

### Out of Scope
- Changing the **Gerar exemplo** UI/entry point (`DataPage`) — unchanged.
- Importing the JSON as a *replace-all* backup (generate-example stays additive,
  no wipe, no confirmation).
- Bundling/hosting the external exercise **media** — URLs are used as-is (load
  when online; placeholder offline).
- Creating a second gym when one already exists (kept: gym+weights only seeded
  when there are no gyms).

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | No | No schema change; inserts via existing stores. |
| Data layer | Yes | Bundle `example-data.json`; rewrite `generateExample` (remapped insert). |
| State | No | — |
| UI | No | `DataPage` "Gerar exemplo" button unchanged. |
| Tests | Yes | Update the generate-example test; decouple home/session integration tests from the sample content. |
| i18n / copy | No | — |

## Architecture Considerations

- **Bundled JSON, offline-first.** Importing a JSON module keeps the data in the
  build (no network), consistent with the local-only design.
- **Id remapping = additive safety.** Mirrors `importExercisesMerge` — insert
  and remap references (category→exercise→day, gym→weight) so auto-increment ids
  never collide with existing data.
- **Fits the derived-categories model.** Days drop the JSON's `categoryId`;
  their categories come from the exercises (issue #1). Day names already name the
  muscle groups, so the derived labels line up.
- **Test coupling.** Several tests currently assume the old demo ("Dia 1",
  "Supino Reto", 3 exercises → 33%). They will seed their own controlled data so
  the example content can change freely.

## Success Criteria

- [ ] Tapping **Gerar exemplo** on a fresh app creates: gym "Fit Park",
      8 categories, 27 exercises (with media), 6 days, and 18 weights.
- [ ] Days show their **derived** categories on Home; exercise media renders
      (or placeholder offline).
- [ ] Running it again (or with existing data) does not overwrite/duplicate-break
      anything (remapped, additive).
- [ ] `npm run build`, `npm run typecheck`, `npm test` pass, with the
      generate-example test updated and the other tests decoupled.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Home/session tests break (hardcoded demo names/weights) | High | Med | Seed those tests' own fixtures via repos; assert against them, not the sample. |
| External media URLs fail offline / rot over time | Med | Low | Media falls back to a placeholder; example is for exploring, media loads online. |
| JSON day `categoryId` mis-applied | Low | Low | Explicitly ignore it — day categories are derived from exercises. |
| Large-ish JSON bloats the bundle | Low | Low | ~9 KB; negligible. |

---

## Archive Information

**Archived:** 2026-07-10
**Duration:** 0 days (created and completed 2026-07-10)
**Outcome:** Successfully implemented

### Files Modified
- `src/data/example-data.json` (new — bundled issue #4 backup)
- `src/data/portability.ts` — `generateExample` rewritten (remapped insert from the dataset)
- `src/data/portability.test.ts`, `src/features/home/home.integration.test.tsx`,
  `src/features/session/session.integration.test.tsx` (decoupled from sample content)

### Specs Updated
- `openspec/specs/data-portability/spec.md` — modified **Generate Example Data**
  (bundled realistic routine; additive with id remapping; derived day categories;
  gym+weights only when none exists)

### Verification
- `npm run build`, `npm run typecheck`, `npm test` (65/65) — all pass
- Visual pass at 390px: Gerar exemplo → gym "Fit Park", 8 categories, 27 exercises
  (media), 6 days (derived categories), 18 weights
